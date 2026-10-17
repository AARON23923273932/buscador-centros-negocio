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
import { en } from './listas.ts';
import { clavesDeOrdenes } from './ordenes.ts';

const COMPARADOR = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

const MARCAS_TILDE = /[\u0300-\u036f]/g;

export const CAMPOS: readonly Campo[] = ['codigoCentro', 'descripcionCentro', 'cliente', 'ordenCompra', 'tipoOrden', 'estado'];

export const NOMBRES_CAMPOS: Readonly<Record<Campo, string>> = {
  codigoCentro: 'Código del centro de negocio',
  descripcionCentro: 'Descripción del centro de negocio',
  cliente: 'Cliente',
  ordenCompra: 'Orden de compra / servicio',
  tipoOrden: 'Tipo de orden',
  estado: 'Estado',
};

export function normalizarTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  return (
    String(valor)
      .normalize('NFD')
      .replace(MARCAS_TILDE, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function compactar(valor: unknown): string {
  return normalizarTexto(valor).replace(/[^a-z0-9]/g, '');
}

export function dividirTerminos(consulta: unknown): string[] {
  const vistos = new Set<string>();
  for (const parte of normalizarTexto(consulta).split(' ')) {
    if (parte) vistos.add(parte);
  }
  return [...vistos];
}

export function prepararFila<F extends FilaBase>(fila: F): F & DatosBusqueda {
  const preparada = fila as F & DatosBusqueda;
  const normales = fila.celdas.map((c) => normalizarTexto(c.t));
  preparada._busqueda = normales.join('\n');
  preparada._compacta = fila.celdas.map((c) => compactar(c.t)).join('\n');
  const norm = {} as Record<Campo, string>;
  for (const campo of CAMPOS) {
    norm[campo] = normalizarTexto(fila.campos?.[campo]);
  }
  preparada._norm = norm;
  return preparada;
}

function contieneTermino(textoNormal: string, textoCompacto: string, termino: string): boolean {
  if (!termino) return true;
  if (textoNormal.includes(termino)) return true;
  const compacto = termino.replace(/[^a-z0-9]/g, '');
  return compacto !== '' && textoCompacto.includes(compacto);
}

function campoContiene(fila: Fila, campo: Campo, filtroNormal: string): boolean {
  if (!filtroNormal) return true;
  const valor = fila._norm[campo] || '';
  return contieneTermino(valor, valor.replace(/[^a-z0-9]/g, ''), filtroNormal);
}

export const FILTROS_VACIOS: Readonly<Filtros> = Object.freeze({
  q: '',
  cliente: '',
  codigo: '',
  descripcion: '',
  orden: '',
  tipo: '',
  estado: '',
});

export const CLAVES_FILTRO = Object.keys(FILTROS_VACIOS) as ClaveFiltro[];

export function contarFiltrosActivos(filtros: Partial<Record<ClaveFiltro, unknown>> | null | undefined): number {
  return CLAVES_FILTRO.filter((k) => k !== 'q' && normalizarTexto(filtros?.[k]) !== '').length;
}

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

function esVacio(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

export function compararValores(a: unknown, b: unknown): number {
  const va = esVacio(a);
  const vb = esVacio(b);
  if (va || vb) return va === vb ? 0 : va ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const na = typeof a === 'number';
  if (na !== (typeof b === 'number')) return na ? -1 : 1;
  return COMPARADOR.compare(String(a), String(b));
}

function compararConDireccion(a: unknown, b: unknown, direccion: Direccion): number {
  const va = esVacio(a);
  const vb = esVacio(b);
  if (va || vb) return va === vb ? 0 : va ? 1 : -1;
  const r = compararValores(a, b);
  return direccion === 'desc' ? -r : r;
}

export function ordenarFilas<F extends FilaBase>(
  filas: readonly F[],
  indiceColumna: number | null | undefined,
  direccion: Direccion = 'asc',
): F[] {
  if (indiceColumna === null || indiceColumna === undefined || indiceColumna < 0) return filas.slice();
  return filas.slice().sort((x, y) => {
    const r = compararConDireccion(x.celdas[indiceColumna]?.o, y.celdas[indiceColumna]?.o, direccion);
    return r !== 0 ? r : x.id - y.id;
  });
}

interface GrupoEnConstruccion extends Grupo {
  _clientesVistos: Set<string>;
  _ordenesVistas: Set<string>;
}

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
    for (const orden of clavesDeOrdenes(fila.campos.ordenCompra)) {
      if (!g._ordenesVistas.has(orden)) {
        g._ordenesVistas.add(orden);
        g.ordenes += 1;
      }
    }
  }
  return [...grupos.values()].map(({ _clientesVistos, _ordenesVistas, ...g }) => g);
}

export const CLAVES_GRUPO = ['codigo', 'descripcion', 'cliente', 'ordenes'] as const;
type ClaveGrupo = (typeof CLAVES_GRUPO)[number];

const esClaveGrupo = (clave: string): clave is ClaveGrupo => (CLAVES_GRUPO as readonly string[]).includes(clave);

export function ordenarGrupos(grupos: readonly Grupo[], clave: string, direccion: Direccion = 'asc'): Grupo[] {
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

export function paginar<T>(lista: readonly T[], pagina = 1, tamano = 50): Pagina<T> {
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

type FilaConCampos = FilaBase & Partial<DatosBusqueda>;

export function valoresUnicos(filas: readonly FilaConCampos[], campo: Campo): string[] {
  const vistos = new Map<string, Map<string, number>>();
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
      if (
        mejor === null ||
        veces > mejor.veces ||
        (veces === mejor.veces && empiezaConMayuscula(texto) && !empiezaConMayuscula(mejor.texto))
      ) {
        mejor = { texto, veces };
      }
    }
    return (mejor as { texto: string }).texto;
  };
  return [...vistos.values()].map(elegir).sort((a, b) => COMPARADOR.compare(a, b));
}

export const CAMPOS_OPCIONALES: readonly Campo[] = ['tipoOrden', 'estado'];

export function sePuedeFiltrar(campo: Campo, mapa: MapaCampos | null | undefined, filas: readonly FilaConCampos[]): boolean {
  if (!mapa || !(campo in mapa)) return false;
  return !CAMPOS_OPCIONALES.includes(campo) || valoresUnicos(filas, campo).length > 0;
}

export interface Segmento {
  texto: string;
  marcado: boolean;
}

const caracterEn = (texto: string, i: number): string => String.fromCodePoint(texto.codePointAt(i) ?? 0);

export function segmentosResaltado(texto: unknown, terminos: readonly string[] | null | undefined): Segmento[] {
  const original = texto === null || texto === undefined ? '' : String(texto);
  const lista = (terminos || []).filter(Boolean);
  if (!original) return [];
  if (lista.length === 0) return [{ texto: original, marcado: false }];

  let normal = '';
  const mapa: number[] = [];
  for (let i = 0; i < original.length; ) {
    const caracter = caracterEn(original, i);
    const n = caracter.normalize('NFD').replace(MARCAS_TILDE, '').toLowerCase();
    for (let k = 0; k < n.length; k++) {
      normal += n.charAt(k);
      mapa.push(i);
    }
    i += caracter.length;
  }

  let compacto = '';
  const mapaCompacto: number[] = [];
  for (let k = 0; k < normal.length; k++) {
    const letra = normal.charAt(k);
    if (/[a-z0-9]/.test(letra)) {
      compacto += letra;
      mapaCompacto.push(en(mapa, k));
    }
  }

  const rangos: [number, number][] = [];
  const marcar = (donde: string, posiciones: number[], buscado: string): boolean => {
    let hubo = false;
    let desde = 0;
    while (buscado && desde <= donde.length - buscado.length) {
      const pos = donde.indexOf(buscado, desde);
      if (pos === -1) break;
      const ini = en(posiciones, pos);
      const ultimo = en(posiciones, pos + buscado.length - 1);
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
  const [primero, ...resto] = rangos.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (!primero) return [{ texto: original, marcado: false }];
  let actual: [number, number] = [primero[0], primero[1]];
  const unidos = [actual];
  for (const [ini, fin] of resto) {
    if (ini <= actual[1]) {
      actual[1] = Math.max(actual[1], fin);
    } else {
      actual = [ini, fin];
      unidos.push(actual);
    }
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
