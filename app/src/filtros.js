// =============================================================================
// filtros.js — Funciones PURAS para buscar, filtrar, ordenar, agrupar y paginar.
//
// "Pura" significa: recibe datos, devuelve un resultado y NO toca la pantalla
// ni nada externo. Por eso son fáciles de probar (ver tests/unit/filtros.test.js).
//
// Cada fila que llega aquí tiene esta forma (la arma datos.js):
//   {
//     id: 5,                         // número de fila en el Excel
//     celdas: [{ t, o, v, z }, ...], // t = texto que se ve, o = valor para ordenar,
//                                    // v = valor para exportar, z = formato de Excel (opcional)
//     campos: { codigoCentro: 'CN-0001', cliente: 'Cliente Demo A', ... },
//   }
// =============================================================================

/** Comparador de textos en español: "a" = "á", "2" < "10". */
const COMPARADOR = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

/** Tildes "sueltas" que quedan después de normalize('NFD') (rango Unicode U+0300–U+036F). */
const MARCAS_TILDE = /[\u0300-\u036f]/g;

/** Campos lógicos que la app entiende (los nombres reales de columnas van en config.json). */
export const CAMPOS = ['codigoCentro', 'descripcionCentro', 'cliente', 'ordenCompra', 'tipoOrden', 'estado'];

/** Nombre "humano" de cada campo, para mensajes en pantalla. */
export const NOMBRES_CAMPOS = {
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
export function normalizarTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .normalize('NFD')
    // NFD separa la letra de su tilde ("é" -> "e" + tilde suelta); aquí se borran las tildes sueltas
    // (también la virgulilla de la ñ y la diéresis).
    .replace(MARCAS_TILDE, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Versión "compacta": solo letras y números. Sirve para que "cn0001" encuentre "CN-0001".
 */
export function compactar(valor) {
  return normalizarTexto(valor).replace(/[^a-z0-9]/g, '');
}

/** Separa lo que escribió el usuario en palabras (sin repetir). "CN 01  cn" -> ["cn","01"] */
export function dividirTerminos(consulta) {
  const vistos = new Set();
  for (const parte of normalizarTexto(consulta).split(' ')) {
    if (parte) vistos.add(parte);
  }
  return [...vistos];
}

/**
 * Precalcula textos normalizados de la fila para que la búsqueda sea rápida.
 * Se llama una sola vez por fila al cargar el Excel.
 */
export function prepararFila(fila) {
  const normales = fila.celdas.map((c) => normalizarTexto(c.t));
  // "\n" separa celdas: una palabra no puede "cruzar" de una celda a otra.
  fila._busqueda = normales.join('\n');
  fila._compacta = fila.celdas.map((c) => compactar(c.t)).join('\n');
  fila._norm = {};
  for (const campo of CAMPOS) {
    fila._norm[campo] = normalizarTexto(fila.campos?.[campo]);
  }
  return fila;
}

/** ¿El texto (ya normalizado) contiene el término? Prueba también la versión compacta. */
function contieneTermino(textoNormal, textoCompacto, termino) {
  if (!termino) return true;
  if (textoNormal.includes(termino)) return true;
  const compacto = termino.replace(/[^a-z0-9]/g, '');
  return compacto !== '' && textoCompacto.includes(compacto);
}

/** ¿El valor de un campo contiene lo escrito en el filtro? */
function campoContiene(fila, campo, filtroNormal) {
  if (!filtroNormal) return true;
  const valor = fila._norm[campo] || '';
  return contieneTermino(valor, valor.replace(/[^a-z0-9]/g, ''), filtroNormal);
}

/**
 * Filtros vacíos. Es la ÚNICA lista de claves de filtro: la usan "Limpiar filtros" (main.js),
 * el estado inicial de la URL (estado-url.js) y contarFiltrosActivos().
 * q = buscador global; las demás son los filtros del panel.
 */
export const FILTROS_VACIOS = Object.freeze({
  q: '',
  cliente: '',
  codigo: '',
  descripcion: '',
  orden: '',
  tipo: '',
  estado: '',
});

/** Cuántos filtros (sin contar el buscador) están activos. */
export function contarFiltrosActivos(filtros) {
  return Object.keys(FILTROS_VACIOS).filter((k) => k !== 'q' && normalizarTexto(filtros?.[k]) !== '').length;
}

/**
 * Aplica el buscador global y los filtros. Todo se combina con "Y":
 * la fila debe cumplir cada filtro y contener cada palabra del buscador.
 */
export function filtrarFilas(filas, filtros = {}) {
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
function esVacio(v) {
  return v === null || v === undefined || v === '';
}

/** Compara dos valores de orden: números antes que textos; textos en orden "humano". */
export function compararValores(a, b) {
  const va = esVacio(a);
  const vb = esVacio(b);
  if (va || vb) return va === vb ? 0 : va ? 1 : -1;
  const na = typeof a === 'number';
  const nb = typeof b === 'number';
  if (na && nb) return a - b;
  if (na !== nb) return na ? -1 : 1;
  return COMPARADOR.compare(String(a), String(b));
}

/** Aplica la dirección pero deja siempre los vacíos al final. */
function compararConDireccion(a, b, direccion) {
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
export function ordenarFilas(filas, indiceColumna, direccion = 'asc') {
  if (indiceColumna === null || indiceColumna === undefined || indiceColumna < 0) return filas.slice();
  return filas.slice().sort((x, y) => {
    const r = compararConDireccion(x.celdas[indiceColumna]?.o, y.celdas[indiceColumna]?.o, direccion);
    return r !== 0 ? r : x.id - y.id;
  });
}

/**
 * Agrupa las filas por centro de negocio (por código; si no hay código, por descripción).
 * Devuelve los grupos en el orden en que aparecen en el Excel.
 */
export function agruparPorCentro(filas) {
  const grupos = new Map();
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
export const CLAVES_GRUPO = ['codigo', 'descripcion', 'cliente', 'ordenes'];

/** Ordena los grupos (vista "Por centro"). */
export function ordenarGrupos(grupos, clave, direccion = 'asc') {
  if (!CLAVES_GRUPO.includes(clave)) return grupos.slice();
  const valor = (g) => {
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
export function paginar(lista, pagina = 1, tamano = 50) {
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

/**
 * Valores distintos de un campo (para los desplegables Cliente, Tipo de orden y Estado), ordenados alfabéticamente.
 * Si un valor está escrito de varias formas ("abierta", "Abierta"), es UNA sola opción y se muestra la forma
 * que más se repite; si empatan, la que empieza con mayúscula; si siguen empatadas, la primera que aparece.
 */
export function valoresUnicos(filas, campo) {
  const vistos = new Map(); // valor normalizado -> Map(forma escrita -> cuántas veces)
  for (const fila of filas) {
    const texto = fila.campos?.[campo];
    const clave = fila._norm?.[campo] ?? normalizarTexto(texto);
    if (!clave) continue;
    if (!vistos.has(clave)) vistos.set(clave, new Map());
    const formas = vistos.get(clave);
    formas.set(texto, (formas.get(texto) || 0) + 1);
  }
  const empiezaConMayuscula = (t) => /^\p{Lu}/u.test(String(t));
  const elegir = (formas) => {
    let mejor = null;
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
    return mejor.texto;
  };
  return [...vistos.values()].map(elegir).sort((a, b) => COMPARADOR.compare(a, b));
}

/** Campos con filtro desplegable que no son obligatorios: si no sirven para filtrar, su filtro no se muestra. */
export const CAMPOS_OPCIONALES = ['tipoOrden', 'estado'];

/**
 * ¿Se puede filtrar por este campo? Hace falta que el Excel tenga la columna (mapa = campo -> columna).
 * Para Tipo de orden y Estado, además, que la columna tenga algún valor: un desplegable con solo
 * "Todos" no sirve para nada.
 */
export function sePuedeFiltrar(campo, mapa, filas) {
  if (!mapa || !(campo in mapa)) return false;
  return !CAMPOS_OPCIONALES.includes(campo) || valoresUnicos(filas, campo).length > 0;
}

/**
 * Escapa HTML. ¡OBLIGATORIO antes de poner cualquier dato del Excel en la página!
 * Así, si una celda dice "<script>…", se ve como texto y no se ejecuta.
 */
export function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Devuelve HTML seguro del texto con las coincidencias envueltas en <mark>.
 * Ignora mayúsculas y tildes: buscar "electrico" resalta "Eléctrico".
 */
export function resaltar(texto, terminos) {
  const original = texto === null || texto === undefined ? '' : String(texto);
  const lista = (terminos || []).filter(Boolean);
  if (!original || lista.length === 0) return escaparHtml(original);

  // Versión normalizada + mapa "posición normalizada -> posición original".
  let normal = '';
  const mapa = [];
  for (let i = 0; i < original.length; ) {
    const caracter = String.fromCodePoint(original.codePointAt(i));
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
  const mapaCompacto = [];
  for (let k = 0; k < normal.length; k++) {
    if (/[a-z0-9]/.test(normal[k])) {
      compacto += normal[k];
      mapaCompacto.push(mapa[k]);
    }
  }

  const rangos = [];
  /** Marca todas las apariciones de "buscado" dentro de "donde" (usando su mapa de posiciones). */
  const marcar = (donde, posiciones, buscado) => {
    let hubo = false;
    let desde = 0;
    while (buscado && desde <= donde.length - buscado.length) {
      const pos = donde.indexOf(buscado, desde);
      if (pos === -1) break;
      const ini = posiciones[pos];
      const ultimo = posiciones[pos + buscado.length - 1];
      const fin = ultimo + String.fromCodePoint(original.codePointAt(ultimo)).length;
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
  if (rangos.length === 0) return escaparHtml(original);

  rangos.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const unidos = [rangos[0].slice()];
  for (const [ini, fin] of rangos.slice(1)) {
    const ult = unidos[unidos.length - 1];
    if (ini <= ult[1]) ult[1] = Math.max(ult[1], fin);
    else unidos.push([ini, fin]);
  }

  let html = '';
  let cursor = 0;
  for (const [ini, fin] of unidos) {
    html += escaparHtml(original.slice(cursor, ini));
    html += `<mark>${escaparHtml(original.slice(ini, fin))}</mark>`;
    cursor = fin;
  }
  html += escaparHtml(original.slice(cursor));
  return html;
}
