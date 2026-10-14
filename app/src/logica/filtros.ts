// =============================================================================
// filtros.ts — Funciones PURAS para buscar, filtrar, ordenar, agrupar y paginar.
//
// "Pura" significa: recibe datos, devuelve un resultado y NO toca la pantalla
// ni nada externo. Por eso son fáciles de probar (ver tests/unit/filtros.test.ts).
//
// Cada fila que llega aquí tiene esta forma (la arma datos.ts, ver tipos.ts):
//   {
//     id: 5,                         // número de fila en el Excel
//     celdas: [{ t, o, v, z }, ...], // t = texto que se ve, o = valor para ordenar,
//                                    // v = valor para exportar, z = formato de Excel (opcional)
//     campos: { codigoCentro: 'CN-0001', cliente: 'Cliente Demo A', ... },
//   }
// =============================================================================

import type {
  Campo,
  ClaveFiltro,
  DatosBusqueda,
  Direccion,
  FilaBase,
  Fila,
  Filtros,
  Grupo,
  MapaCampos,
  Pagina,
} from './tipos.ts';

/** Comparador de textos en español: "a" = "á", "2" < "10". */
const COMPARADOR = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

/**
 * Tildes "sueltas" que quedan después de normalize('NFD') (rango Unicode U+0300–U+036F).
 * Se escriben con su código (\u0300) y no pegadas tal cual: son invisibles y un editor podría cambiarlas
 * sin que se note (tests/unit/codigo-fuente.test.ts lo revisa).
 */
const MARCAS_TILDE = /[\u0300-\u036f]/g;

/** Campos lógicos que la app entiende (los nombres reales de columnas van en config.json). */
export const CAMPOS: readonly Campo[] = ['codigoCentro', 'descripcionCentro', 'cliente', 'ordenCompra', 'tipoOrden', 'estado'];

/** Nombre "humano" de cada campo, para mensajes en pantalla. */
export const NOMBRES_CAMPOS: Readonly<Record<Campo, string>> = {
  codigoCentro: 'Código del centro de negocio',
  descripcionCentro: 'Descripción del centro de negocio',
  cliente: 'Cliente',
  ordenCompra: 'Orden de compra / servicio',
  tipoOrden: 'Tipo de orden',
  estado: 'Estado',
};

/**
 * Deja un texto listo para comparar: minúsculas, sin tildes, sin espacios dobles.
 * Ej.: "  Mantenimiento  ELÉCTRICO " -> "mantenimiento electrico"
 */
export function normalizarTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  return (
    String(valor)
      .normalize('NFD')
      // NFD separa la letra de su tilde ("é" -> "e" + tilde suelta); aquí se borran las tildes sueltas
      // (también la virgulilla de la ñ y la diéresis).
      .replace(MARCAS_TILDE, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Versión "compacta": solo letras y números. Sirve para que "cn0001" encuentre "CN-0001".
 */
export function compactar(valor: unknown): string {
  return normalizarTexto(valor).replace(/[^a-z0-9]/g, '');
}

/** Separa lo que escribió el usuario en palabras (sin repetir). "CN 01  cn" -> ["cn","01"] */
export function dividirTerminos(consulta: unknown): string[] {
  const vistos = new Set<string>();
  for (const parte of normalizarTexto(consulta).split(' ')) {
    if (parte) vistos.add(parte);
  }
  return [...vistos];
}

/**
 * Precalcula textos normalizados de la fila para que la búsqueda sea rápida.
 * Se llama una sola vez por fila al cargar el Excel (modifica la fila y la devuelve).
 */
export function prepararFila<F extends FilaBase>(fila: F): F & DatosBusqueda {
  const preparada = fila as F & DatosBusqueda;
  const normales = fila.celdas.map((c) => normalizarTexto(c.t));
  // "\n" separa celdas: una palabra no puede "cruzar" de una celda a otra.
  preparada._busqueda = normales.join('\n');
  preparada._compacta = fila.celdas.map((c) => compactar(c.t)).join('\n');
  const norm = {} as Record<Campo, string>;
  for (const campo of CAMPOS) {
    norm[campo] = normalizarTexto(fila.campos?.[campo]);
  }
  preparada._norm = norm;
  return preparada;
}

/** ¿El texto (ya normalizado) contiene el término? Prueba también la versión compacta. */
function contieneTermino(textoNormal: string, textoCompacto: string, termino: string): boolean {
  if (!termino) return true;
  if (textoNormal.includes(termino)) return true;
  const compacto = termino.replace(/[^a-z0-9]/g, '');
  return compacto !== '' && textoCompacto.includes(compacto);
}

/** ¿El valor de un campo contiene lo escrito en el filtro? */
function campoContiene(fila: Fila, campo: Campo, filtroNormal: string): boolean {
  if (!filtroNormal) return true;
  const valor = fila._norm[campo] || '';
  return contieneTermino(valor, valor.replace(/[^a-z0-9]/g, ''), filtroNormal);
}

/**
 * Filtros vacíos. Es la ÚNICA lista de claves de filtro: la usan "Limpiar filtros",
 * el estado inicial de la URL (estado-url.ts) y contarFiltrosActivos().
 * q = buscador global; las demás son los filtros del panel.
 */
export const FILTROS_VACIOS: Readonly<Filtros> = Object.freeze({
  q: '',
  cliente: '',
  codigo: '',
  descripcion: '',
  orden: '',
  tipo: '',
  estado: '',
});

/** Las claves de FILTROS_VACIOS, con su tipo. */
export const CLAVES_FILTRO = Object.keys(FILTROS_VACIOS) as ClaveFiltro[];

/** Cuántos filtros (sin contar el buscador) están activos. */
export function contarFiltrosActivos(filtros: Partial<Record<ClaveFiltro, unknown>> | null | undefined): number {
  return CLAVES_FILTRO.filter((k) => k !== 'q' && normalizarTexto(filtros?.[k]) !== '').length;
}

/**
 * Aplica el buscador global y los filtros. Todo se combina con "Y":
 * la fila debe cumplir cada filtro y contener cada palabra del buscador.
 */
export function filtrarFilas<F extends Fila>(filas: readonly F[], filtros: Partial<Filtros> = {}): F[] {
  const terminos = dividirTerminos(filtros.q);
  const cliente = normalizarTexto(filtros.cliente);
  const tipo = normalizarTexto(filtros.tipo);
  const estado = normalizarTexto(filtros.estado);
  const codigo = normalizarTexto(filtros.codigo);
  const descripcion = normalizarTexto(filtros.descripcion);
  const orden = normalizarTexto(filtros.orden);

  return filas.filter((fila) => {
    if (cliente && fila._norm.cliente !== cliente) return false;
    if (tipo && fila._norm.tipoOrden !== tipo) return false;
    if (estado && fila._norm.estado !== estado) return false;
    if (!campoContiene(fila, 'codigoCentro', codigo)) return false;
    if (!campoContiene(fila, 'descripcionCentro', descripcion)) return false;
    if (!campoContiene(fila, 'ordenCompra', orden)) return false;
    return terminos.every((t) => contieneTermino(fila._busqueda, fila._compacta, t));
  });
}

/** ¿Está vacío para ordenar? (vacíos siempre al final) */
function esVacio(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

/** Compara dos valores de orden: números antes que textos; textos en orden "humano". */
export function compararValores(a: unknown, b: unknown): number {
  const va = esVacio(a);
  const vb = esVacio(b);
  if (va || vb) return va === vb ? 0 : va ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const na = typeof a === 'number';
  if (na !== (typeof b === 'number')) return na ? -1 : 1;
  return COMPARADOR.compare(String(a), String(b));
}

/** Aplica la dirección pero deja siempre los vacíos al final. */
function compararConDireccion(a: unknown, b: unknown, direccion: string): number {
  const va = esVacio(a);
  const vb = esVacio(b);
  if (va || vb) return va === vb ? 0 : va ? 1 : -1;
  const r = compararValores(a, b);
  return direccion === 'desc' ? -r : r;
}

/**
 * Ordena filas por una columna (índice dentro de fila.celdas). No modifica el arreglo original.
 * Si dos filas empatan, se respeta el orden del Excel.
 */
export function ordenarFilas<F extends FilaBase>(
  filas: readonly F[],
  indiceColumna: number | null | undefined,
  direccion: Direccion | string = 'asc',
): F[] {
  if (indiceColumna === null || indiceColumna === undefined || indiceColumna < 0) return filas.slice();
  return filas.slice().sort((x, y) => {
    const r = compararConDireccion(x.celdas[indiceColumna]?.o, y.celdas[indiceColumna]?.o, direccion);
    return r !== 0 ? r : x.id - y.id;
  });
}

/** Grupo mientras se arma: con los clientes y órdenes ya vistos (sin repetir). */
interface GrupoEnConstruccion extends Grupo {
  _clientesVistos: Set<string>;
  _ordenesVistas: Set<string>;
}

/**
 * Agrupa las filas por centro de negocio (por código; si no hay código, por descripción).
 * Devuelve los grupos en el orden en que aparecen en el Excel.
 */
export function agruparPorCentro(filas: readonly Fila[]): Grupo[] {
  const grupos = new Map<string, GrupoEnConstruccion>();
  for (const fila of filas) {
    const codigo = fila._norm.codigoCentro;
    const desc = fila._norm.descripcionCentro;
    const clave = codigo ? `c:${codigo}` : desc ? `d:${desc}` : 'sin-codigo';
    let g = grupos.get(clave);
    if (!g) {
      g = {
        clave,
        codigo: '',
        descripcion: '',
        clientes: [],
        _clientesVistos: new Set(),
        _ordenesVistas: new Set(),
        ordenes: 0,
        filas: [],
        primeraFila: fila.id,
      };
      grupos.set(clave, g);
    }
    g.filas.push(fila);
    if (!g.codigo && fila.campos.codigoCentro) g.codigo = fila.campos.codigoCentro;
    if (!g.descripcion && fila.campos.descripcionCentro) g.descripcion = fila.campos.descripcionCentro;
    const cliente = fila.campos.cliente;
    if (cliente && !g._clientesVistos.has(fila._norm.cliente)) {
      g._clientesVistos.add(fila._norm.cliente);
      g.clientes.push(cliente);
    }
    const orden = fila._norm.ordenCompra;
    if (orden && !g._ordenesVistas.has(orden)) {
      g._ordenesVistas.add(orden);
      g.ordenes += 1;
    }
  }
  return [...grupos.values()].map(({ _clientesVistos, _ordenesVistas, ...g }) => g);
}

/** Claves por las que se puede ordenar la vista "Por centro". */
export const CLAVES_GRUPO = ['codigo', 'descripcion', 'cliente', 'ordenes'] as const;
type ClaveGrupo = (typeof CLAVES_GRUPO)[number];

const esClaveGrupo = (clave: string): clave is ClaveGrupo => (CLAVES_GRUPO as readonly string[]).includes(clave);

/** Ordena los grupos (vista "Por centro"). */
export function ordenarGrupos(grupos: readonly Grupo[], clave: string, direccion: Direccion | string = 'asc'): Grupo[] {
  if (!esClaveGrupo(clave)) return grupos.slice();
  const valor = (g: Grupo): string | number => {
    if (clave === 'ordenes') return g.ordenes;
    if (clave === 'cliente') return g.clientes.join(', ');
    return g[clave];
  };
  return grupos.slice().sort((x, y) => {
    const r = compararConDireccion(valor(x), valor(y), direccion);
    return r !== 0 ? r : x.primeraFila - y.primeraFila;
  });
}

/**
 * Corta la lista en páginas.
 * Devuelve { items, pagina, totalPaginas, desde, hasta, total } (desde/hasta empiezan en 1).
 */
export function paginar<T>(lista: readonly T[], pagina: unknown = 1, tamano: unknown = 50): Pagina<T> {
  const total = lista.length;
  const porPagina = Math.max(1, Math.floor(Number(tamano)) || 50);
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const actual = Math.min(Math.max(1, Math.floor(Number(pagina)) || 1), totalPaginas);
  const inicio = (actual - 1) * porPagina;
  const items = lista.slice(inicio, inicio + porPagina);
  return {
    items,
    pagina: actual,
    totalPaginas,
    total,
    desde: total ? inicio + 1 : 0,
    hasta: inicio + items.length,
  };
}

/** Fila con o sin los textos de búsqueda precalculados. */
type FilaConCampos = FilaBase & Partial<DatosBusqueda>;

/**
 * Valores distintos de un campo (para los desplegables Cliente, Tipo de orden y Estado), ordenados alfabéticamente.
 * Si un valor está escrito de varias formas ("abierta", "Abierta"), es UNA sola opción y se muestra la forma
 * que más se repite; si empatan, la que empieza con mayúscula; si siguen empatadas, la primera que aparece.
 */
export function valoresUnicos(filas: readonly FilaConCampos[], campo: Campo): string[] {
  const vistos = new Map<string, Map<string, number>>(); // valor normalizado -> Map(forma escrita -> cuántas veces)
  for (const fila of filas) {
    const texto = fila.campos?.[campo];
    const clave = fila._norm?.[campo] ?? normalizarTexto(texto);
    if (!clave) continue;
    let formas = vistos.get(clave);
    if (!formas) {
      formas = new Map();
      vistos.set(clave, formas);
    }
    formas.set(texto, (formas.get(texto) || 0) + 1);
  }
  const empiezaConMayuscula = (t: string) => /^\p{Lu}/u.test(String(t));
  const elegir = (formas: Map<string, number>): string => {
    let mejor: { texto: string; veces: number } | null = null;
    for (const [texto, veces] of formas) {
      // Map conserva el orden en que aparecieron: con empate total gana la primera.
      if (
        mejor === null ||
        veces > mejor.veces ||
        (veces === mejor.veces && empiezaConMayuscula(texto) && !empiezaConMayuscula(mejor.texto))
      ) {
        mejor = { texto, veces };
      }
    }
    // Cada Map de formas tiene al menos una entrada (se crea al ver la primera).
    return (mejor as { texto: string }).texto;
  };
  return [...vistos.values()].map(elegir).sort((a, b) => COMPARADOR.compare(a, b));
}

/** Campos con filtro desplegable que no son obligatorios: si no sirven para filtrar, su filtro no se muestra. */
export const CAMPOS_OPCIONALES: readonly Campo[] = ['tipoOrden', 'estado'];

/**
 * ¿Se puede filtrar por este campo? Hace falta que el Excel tenga la columna (mapa = campo -> columna).
 * Para Tipo de orden y Estado, además, que la columna tenga algún valor: un desplegable con solo
 * "Todos" no sirve para nada.
 */
export function sePuedeFiltrar(campo: Campo, mapa: MapaCampos | null | undefined, filas: readonly FilaConCampos[]): boolean {
  if (!mapa || !(campo in mapa)) return false;
  return !CAMPOS_OPCIONALES.includes(campo) || valoresUnicos(filas, campo).length > 0;
}

/** Un trozo de texto, resaltado (marcado = true) o no. */
export interface Segmento {
  texto: string;
  marcado: boolean;
}

/** Carácter completo (también los emojis, que ocupan dos posiciones) que empieza en la posición i. */
const caracterEn = (texto: string, i: number): string => String.fromCodePoint(texto.codePointAt(i) ?? 0);

/**
 * Parte el texto en trozos: los que coinciden con la búsqueda (marcado = true) y los demás.
 * Ignora mayúsculas y tildes: buscar "electrico" marca "Eléctrico".
 * La pantalla dibuja cada trozo marcado como <mark> (componentes/Resaltado.tsx): React escapa el
 * texto, así que un dato del Excel NUNCA se interpreta como HTML.
 */
export function segmentosResaltado(texto: unknown, terminos: readonly string[] | null | undefined): Segmento[] {
  const original = texto === null || texto === undefined ? '' : String(texto);
  const lista = (terminos || []).filter(Boolean);
  if (!original) return [];
  if (lista.length === 0) return [{ texto: original, marcado: false }];

  // Versión normalizada + mapa "posición normalizada -> posición original".
  let normal = '';
  const mapa: number[] = [];
  for (let i = 0; i < original.length; ) {
    const caracter = caracterEn(original, i);
    const n = caracter.normalize('NFD').replace(MARCAS_TILDE, '').toLowerCase();
    for (let k = 0; k < n.length; k++) {
      normal += n[k];
      mapa.push(i);
    }
    i += caracter.length;
  }

  // Versión "compacta" (solo letras y números) con su propio mapa, igual que en la búsqueda:
  // así "cn0005" también resalta "CN-0005".
  let compacto = '';
  const mapaCompacto: number[] = [];
  for (let k = 0; k < normal.length; k++) {
    if (/[a-z0-9]/.test(normal[k])) {
      compacto += normal[k];
      mapaCompacto.push(mapa[k]);
    }
  }

  const rangos: [number, number][] = [];
  /** Marca todas las apariciones de "buscado" dentro de "donde" (usando su mapa de posiciones). */
  const marcar = (donde: string, posiciones: number[], buscado: string): boolean => {
    let hubo = false;
    let desde = 0;
    while (buscado && desde <= donde.length - buscado.length) {
      const pos = donde.indexOf(buscado, desde);
      if (pos === -1) break;
      const ini = posiciones[pos];
      const ultimo = posiciones[pos + buscado.length - 1];
      const fin = ultimo + caracterEn(original, ultimo).length;
      rangos.push([ini, fin]);
      hubo = true;
      desde = pos + buscado.length;
    }
    return hubo;
  };
  for (const termino of lista) {
    const terminoNormal = normalizarTexto(termino);
    if (!marcar(normal, mapa, terminoNormal)) {
      marcar(compacto, mapaCompacto, terminoNormal.replace(/[^a-z0-9]/g, ''));
    }
  }
  if (rangos.length === 0) return [{ texto: original, marcado: false }];

  // Se unen los rangos que se superponen o se tocan.
  rangos.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const unidos: [number, number][] = [[rangos[0][0], rangos[0][1]]];
  for (const [ini, fin] of rangos.slice(1)) {
    const ult = unidos[unidos.length - 1];
    if (ini <= ult[1]) ult[1] = Math.max(ult[1], fin);
    else unidos.push([ini, fin]);
  }

  const segmentos: Segmento[] = [];
  let cursor = 0;
  for (const [ini, fin] of unidos) {
    if (ini > cursor) segmentos.push({ texto: original.slice(cursor, ini), marcado: false });
    segmentos.push({ texto: original.slice(ini, fin), marcado: true });
    cursor = fin;
  }
  if (cursor < original.length) segmentos.push({ texto: original.slice(cursor), marcado: false });
  return segmentos;
}
