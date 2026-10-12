// =============================================================================
// datos.js — Descarga el Excel y lo convierte en filas que la tabla entiende.
//
// Pasos:
//   1. descargarExcel(): trae el archivo (de la propia web en modo demo, o de
//      SharePoint/OneDrive con Microsoft Graph en modo real).
//   2. leerLibro(): abre el Excel con SheetJS (librería "xlsx"), busca la fila
//      de títulos, reconoce las columnas y limpia cada celda.
//
// El Excel lo llena un bot, así que se asume que puede venir "desordenado":
// títulos que no están en la fila 1, filas vacías, celdas combinadas o vacías
// debajo del centro, fechas guardadas como número, números guardados como texto,
// ceros a la izquierda, hojas ocultas, celdas con error (#N/A)…
// =============================================================================

// Se importa la versión ESM (xlsx.mjs) para que el navegador y las pruebas usen exactamente lo mismo.
import * as XLSX from 'xlsx/xlsx.mjs';
import { CAMPOS, NOMBRES_CAMPOS, normalizarTexto, prepararFila } from './filtros.js';
import { ErrorDatos, descargarDesdeGraph } from './graph.js';

export { ErrorDatos };

const CELDA_VACIA = Object.freeze({ t: '', o: '', v: '' });

/**
 * Campos que son "códigos" (código del centro, número de orden): su texto nunca se
 * interpreta como fecha (ej. "10-01-0002") y se exporta tal cual, como texto.
 */
const CAMPOS_IDENTIFICADOR = new Set(['codigoCentro', 'ordenCompra']);

/**
 * "Familia" de cada campo: el código y la descripción hablan del centro; la orden y su tipo, de la orden.
 * El estado va aparte: "Código estado" no es el código del centro.
 */
const GRUPO_CAMPO = {
  codigoCentro: 'centro',
  descripcionCentro: 'centro',
  cliente: 'cliente',
  ordenCompra: 'orden',
  tipoOrden: 'orden',
  estado: 'estado',
};

/**
 * Palabras genéricas de un título ("Código", "Descripción"…). Si después de ellas viene el nombre de
 * OTRA familia ("Código Cliente", "Descripción de la orden"), la columna habla de esa otra cosa.
 */
const PALABRAS_GENERICAS = new Set(['codigo', 'cod', 'descripcion', 'desc', 'detalle', 'nombre', 'numero', 'nro', 'num']);

/** Quita espacios de más. ("\s" también cubre el espacio "duro" U+00A0 que a veces pega Excel). */
export function limpiarTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/\s+/g, ' ').trim();
}

/**
 * Encabezado normalizado: sin tildes, minúsculas y sin signos.
 * Las siglas con puntos o barra se juntan: "Nro. O.C." -> "nro oc", "O/C" -> "oc", "N° Orden" -> "n orden".
 */
export function normalizarEncabezado(valor) {
  return normalizarTexto(valor)
    .replace(/\b([a-z])[./](?=[a-z]\b)/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const dosDigitos = (n) => String(n).padStart(2, '0');

/** Años que se aceptan como fecha (evita que un código como "10-01-0002" pase por fecha). */
const ANIO_MIN = 1900;
const ANIO_MAX = 2100;

/** Clave numérica para ordenar fechas: 2026-03-15 14:30 -> 202603151430 */
function claveFecha(anio, mes, dia, hora = 0, minuto = 0) {
  return anio * 1e8 + mes * 1e6 + dia * 1e4 + hora * 100 + minuto;
}

/** Número de serie de Excel (lo que Excel guarda por dentro para una fecha): días desde el 30/12/1899. */
function serialExcel(anio, mes, dia, hora = 0, minuto = 0, segundo = 0) {
  return (Date.UTC(anio, mes - 1, dia, hora, minuto, segundo) - Date.UTC(1899, 11, 30)) / 86400000;
}

const diasDelMes = (anio, mes) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();

const HORA_TEXTO = '(?:[ T](\\d{1,2}):(\\d{2})(?::(\\d{2})(?:\\.\\d+)?)?)?';
// dd/mm/aaaa, dd-mm-aaaa, dd.mm.aaaa (el mismo separador las dos veces) y dd/mm/aa.
const FECHA_DIA_PRIMERO = new RegExp(`^(\\d{1,2})([/.-])(\\d{1,2})\\2(\\d{4}|\\d{2})${HORA_TEXTO}$`);
// aaaa-mm-dd (formato ISO), con hora y zona horaria opcionales (la zona se ignora).
const FECHA_ISO = new RegExp(`^(\\d{4})-(\\d{1,2})-(\\d{1,2})${HORA_TEXTO}(?:Z|[+-]\\d{2}:?\\d{2})?$`);

/** Partes de una fecha escrita como texto, o null si no es una fecha válida. */
function partesFechaTexto(texto) {
  let anio;
  let mes;
  let dia;
  let horas;
  let m = FECHA_DIA_PRIMERO.exec(texto);
  if (m) {
    // Año de 2 dígitos solo con "/" ("15/03/26"); "10-01-02" se parece más a un código.
    if (m[4].length === 2 && m[2] !== '/') return null;
    dia = Number(m[1]);
    mes = Number(m[3]);
    anio = m[4].length === 2 ? 2000 + Number(m[4]) : Number(m[4]);
    horas = m.slice(5, 8);
  } else {
    m = FECHA_ISO.exec(texto);
    if (!m) return null;
    anio = Number(m[1]);
    mes = Number(m[2]);
    dia = Number(m[3]);
    horas = m.slice(4, 7);
  }
  const [hora, minuto, segundo] = horas.map((x) => Number(x || 0));
  if (anio < ANIO_MIN || anio > ANIO_MAX || mes < 1 || mes > 12 || dia < 1 || dia > diasDelMes(anio, mes)) return null;
  if (hora > 23 || minuto > 59 || segundo > 59) return null;
  return { anio, mes, dia, hora, minuto, segundo, conHora: horas[0] !== undefined };
}

/** Reconoce fechas escritas como texto: "15/03/2026", "15-03-2026 14:30", "15/03/26", "2026-03-15". */
export function fechaDesdeTexto(texto) {
  const p = partesFechaTexto(String(texto ?? '').trim());
  return p ? claveFecha(p.anio, p.mes, p.dia, p.hora, p.minuto) : null;
}

const PREFIJO_MONEDA = /^(S\/\.?|US\$|\$|USD|PEN|€)\s*/i;

/**
 * Reconoce números guardados como texto: "1,250.50", "S/ 1 250", "0004500123", "-12.5".
 * Devuelve el número o null si no parece un número.
 */
export function numeroDesdeTexto(texto) {
  const limpio = String(texto).trim().replace(PREFIJO_MONEDA, '').replace(/\s/g, '');
  if (!/^[-+]?\d[\d.,]*$/.test(limpio)) return null;
  let s = limpio;
  const ultimaComa = s.lastIndexOf(',');
  const ultimoPunto = s.lastIndexOf('.');
  if (ultimaComa !== -1 && ultimoPunto !== -1) {
    // El separador que aparece al final es el decimal.
    s = ultimaComa > ultimoPunto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (ultimaComa !== -1) {
    s = /^[-+]?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Formato de Excel para un número que venía como texto ("73,748.89" -> "#,##0.00"; "S/ 2,000" -> "S/ "#,##0). */
function formatoDeNumeroTexto(texto) {
  const simbolo = PREFIJO_MONEDA.exec(texto)?.[1];
  const cuerpo = texto.replace(PREFIJO_MONEDA, '');
  const base = /[.,]\d{1,2}$/.test(cuerpo) ? '#,##0.00' : /[.,]/.test(cuerpo) ? '#,##0' : '';
  if (simbolo) return `"${simbolo} "${base || '0'}`;
  return base || undefined;
}

/** ¿El formato de número de Excel es de fecha? */
function esFormatoFecha(formato) {
  if (!formato || typeof formato !== 'string') return false;
  try {
    return XLSX.SSF.is_date(formato);
  } catch {
    return false;
  }
}

/**
 * ¿Qué muestra un formato de fecha de Excel? "dd/mm/yyyy" -> fecha; "hh:mm" -> solo hora;
 * "dd/mm/yyyy hh:mm" -> las dos. Se ignoran textos entre comillas, colores y "AM/PM".
 */
export function partesFormato(formato) {
  const s = String(formato || '')
    .split(';')[0]
    .replace(/"[^"]*"/g, '')
    .replace(/\\./g, '')
    .replace(/\[(h+|m+|s+)\]/gi, '$1')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/AM\/PM|A\/P/gi, '');
  const tieneHora = /[hs]/i.test(s);
  return {
    tieneFecha: /[dy]/i.test(s) || (/m/i.test(s) && !tieneHora),
    tieneHora,
    tieneSegundos: /s/i.test(s),
  };
}

/** Celda numérica con formato de fecha/hora -> texto como lo muestra Excel + valor para exportar como fecha. */
function convertirFecha(celda, date1904) {
  const f = XLSX.SSF.parse_date_code(celda.v, { date1904 });
  if (!f) return null;
  const { tieneFecha, tieneHora, tieneSegundos } = partesFormato(celda.z);
  const hora = `${dosDigitos(f.H)}:${dosDigitos(f.M)}` + (tieneSegundos ? `:${dosDigitos(f.S)}` : '');
  if (!tieneFecha) {
    // Solo hora, ej. "18:00".
    return { t: hora, o: f.H * 1e4 + f.M * 100 + f.S, v: celda.v % 1, z: tieneSegundos ? 'hh:mm:ss' : 'hh:mm' };
  }
  const fecha = `${dosDigitos(f.d)}/${dosDigitos(f.m)}/${f.y}`;
  return {
    // La hora se muestra solo si el formato de Excel la muestra.
    t: tieneHora ? `${fecha} ${hora}` : fecha,
    o: claveFecha(f.y, f.m, f.d, f.H, f.M),
    // Al exportar se guarda como fecha de verdad (sistema 1900, el normal de Excel).
    v: serialExcel(f.y, f.m, f.d, f.H, f.M, f.S),
    z: tieneHora ? (tieneSegundos ? 'dd/mm/yyyy hh:mm:ss' : 'dd/mm/yyyy hh:mm') : 'dd/mm/yyyy',
  };
}

/** Fecha reconocida en un texto -> mismo formato que una fecha de Excel. */
function celdaDeFecha(texto, p) {
  return {
    t: texto,
    o: claveFecha(p.anio, p.mes, p.dia, p.hora, p.minuto),
    v: serialExcel(p.anio, p.mes, p.dia, p.hora, p.minuto, p.segundo),
    z: p.conHora ? 'dd/mm/yyyy hh:mm' : 'dd/mm/yyyy',
  };
}

/**
 * Convierte una celda de SheetJS en { t, o, v, z? , e? }:
 *   t = texto que se muestra (usa el texto formateado de Excel para no perder ceros a la izquierda)
 *   o = valor para ordenar (número o texto)
 *   v = valor para exportar (número si es número o fecha de verdad; si no, texto)
 *   z = formato de Excel para exportar (ej. "dd/mm/yyyy", "#,##0.00"), si hace falta
 *   e = true si la celda tiene un error de fórmula (#N/A, #DIV/0!…)
 *
 * @param {object} [opciones] { date1904: el libro usa el sistema de fechas 1904,
 *                              esIdentificador: la columna es un código (no buscar fechas en el texto) }
 */
export function convertirCelda(celda, opciones = {}) {
  if (!celda || celda.t === 'z' || (celda.v === undefined && celda.w === undefined)) return CELDA_VACIA;
  const { date1904 = false, esIdentificador = false } = opciones;

  if (celda.t === 'n' && typeof celda.v === 'number') {
    if (esFormatoFecha(celda.z)) {
      const fecha = convertirFecha(celda, date1904);
      if (fecha) return fecha;
    }
    let texto = limpiarTexto(celda.w ?? String(celda.v));
    // Con formato "General", Excel muestra los números largos así: 4.50012E+11.
    // Se muestra el número completo para que se pueda leer y buscar.
    if (/e[+-]/i.test(texto) && Number.isSafeInteger(celda.v)) texto = String(celda.v);
    // Si el formato agrega ceros a la izquierda (ej. "0004500123"), se exporta como texto para no perderlos.
    if (/^-?0\d/.test(texto)) return { t: texto, o: celda.v, v: texto };
    const r = { t: texto, o: celda.v, v: celda.v };
    if (celda.z && celda.z !== 'General') r.z = celda.z;
    return r;
  }

  if (celda.t === 'b') {
    const texto = celda.v ? 'Sí' : 'No';
    return { t: texto, o: texto, v: texto };
  }

  if (celda.t === 'd' && celda.v instanceof Date) {
    const d = celda.v;
    const p = { anio: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate(), hora: 0, minuto: 0, segundo: 0, conHora: false };
    return celdaDeFecha(`${dosDigitos(p.dia)}/${dosDigitos(p.mes)}/${p.anio}`, p);
  }

  if (celda.t === 'e') {
    // Error de fórmula: se muestra tal cual, pero no cuenta como dato (ver leerLibro).
    const texto = limpiarTexto(celda.w || '#ERROR');
    return { t: texto, o: texto, v: texto, e: true };
  }

  // Texto (o cualquier otro tipo): se limpia y se intenta reconocer fecha/número para ordenar bien.
  const texto = limpiarTexto(celda.w !== undefined && celda.t !== 's' ? celda.w : celda.v);
  if (!texto) return CELDA_VACIA;
  if (!esIdentificador) {
    const p = partesFechaTexto(texto);
    if (p) return celdaDeFecha(texto, p);
  }
  const numero = numeroDesdeTexto(texto);
  if (numero === null) return { t: texto, o: texto, v: texto };
  // Número guardado como texto: se ordena como número. Al exportar pasa a ser número de verdad
  // (para que SUMA() lo cuente), salvo los códigos y los que tienen ceros a la izquierda.
  if (esIdentificador || /^[-+]?0\d/.test(texto.replace(PREFIJO_MONEDA, ''))) return { t: texto, o: numero, v: texto };
  const r = { t: texto, o: numero, v: numero };
  const z = formatoDeNumeroTexto(texto);
  if (z) r.z = z;
  return r;
}

/** ¿Celda con fórmula pero sin resultado guardado? (pasa si el bot escribe fórmulas y nadie abrió el Excel). */
function esFormulaSinValor(celda) {
  return Boolean(celda?.f) && (celda.t === 'z' || celda.v === undefined || (celda.t === 's' && celda.v === ''));
}

/** Las palabras cortas ("oc", "tipo") solo cuentan si el título es exactamente igual. */
const sirveParaParecido = (alias) => alias.length >= 6 || alias.includes(' ');
const sinEspacios = (s) => s.replace(/ /g, '');

/**
 * Decide qué columna del Excel corresponde a cada campo lógico.
 * Reglas (en este orden): 1) título igual a un alias; 2) igual sin contar espacios ("Nro OC" = "NroOC");
 * 3) título que EMPIEZA con un alias; 4) título que CONTIENE un alias.
 * En 3 y 4 se descarta un título genérico que habla de otra cosa: "Código Cliente" no es el código del centro.
 * Los alias se prueban en el orden de config.json.
 *
 * @param {string[]} titulos  Títulos de las columnas tal como están en el Excel.
 * @param {object} aliasPorCampo  config.columnas
 * @param {boolean[]} [evitar]  columnas que se usan solo si ninguna otra sirve (ej. las de montos, que se ocultan)
 * @returns {object} { campo: índiceDeColumna }
 */
export function mapearColumnas(titulos, aliasPorCampo, evitar = []) {
  const normales = titulos.map(normalizarEncabezado);
  const usados = new Set();
  const mapa = {};
  const aliasNorm = {};
  for (const campo of CAMPOS) {
    aliasNorm[campo] = (Array.isArray(aliasPorCampo?.[campo]) ? aliasPorCampo[campo] : [])
      .map(normalizarEncabezado)
      .filter(Boolean);
  }

  const hablaDeOtraCosa = (campo, alias, resto) => {
    if (!PALABRAS_GENERICAS.has(alias)) return false;
    const r = ` ${resto.trim()} `;
    return CAMPOS.some(
      (otro) => GRUPO_CAMPO[otro] !== GRUPO_CAMPO[campo] && aliasNorm[otro].some((a) => r.includes(` ${a} `)),
    );
  };

  const reglas = [
    (titulo, alias) => titulo === alias,
    (titulo, alias) => sinEspacios(titulo) === sinEspacios(alias),
    (titulo, alias, campo) =>
      sirveParaParecido(alias) &&
      (titulo + ' ').startsWith(alias + ' ') &&
      !hablaDeOtraCosa(campo, alias, titulo.slice(alias.length)),
    (titulo, alias, campo) => {
      if (!sirveParaParecido(alias)) return false;
      const t = ` ${titulo} `;
      const i = t.indexOf(` ${alias} `);
      return i !== -1 && !hablaDeOtraCosa(campo, alias, t.slice(0, i) + t.slice(i + alias.length + 2));
    },
  ];

  // Primero se prueban las columnas "normales"; las de "evitar", solo para los campos que sigan sin columna.
  const pasadas = evitar.some(Boolean) ? [(i) => !evitar[i], () => true] : [() => true];
  for (const permitida of pasadas) {
    for (const regla of reglas) {
      for (const campo of CAMPOS) {
        if (campo in mapa) continue;
        buscar: for (const alias of aliasNorm[campo]) {
          for (let i = 0; i < normales.length; i++) {
            if (!usados.has(i) && permitida(i) && normales[i] && regla(normales[i], alias, campo)) {
              mapa[campo] = i;
              usados.add(i);
              break buscar;
            }
          }
        }
      }
    }
  }
  return mapa;
}

/**
 * ¿El título (ya normalizado) tiene una de las palabras de "columnasOcultas" como palabra completa?
 * "monto total" y "monto s" (de "Monto (S/)") tienen "monto"; "montos" o "promonto" no.
 */
export function esTituloOculto(tituloNormal, palabrasNormales) {
  if (!tituloNormal) return false;
  const t = ` ${tituloNormal} `;
  return palabrasNormales.some((p) => p && t.includes(` ${p} `));
}

/** Letra de columna de Excel: 0 -> "A", 27 -> "AB". */
export const letraColumna = (indice) => XLSX.utils.encode_col(indice);

/** ¿La celda tiene algo (un dato o una fórmula)? */
function celdaConContenido(celda) {
  if (!celda) return false;
  if (celda.f) return true;
  if (celda.t === 'z' || (celda.v === undefined && celda.w === undefined)) return false;
  return !(celda.t === 's' && limpiarTexto(celda.v) === '');
}

/** Límites reales de la hoja (el "!ref" de Excel a veces exagera por celdas con formato y sin datos). */
function limitesReales(hoja) {
  let maxF = -1;
  let maxC = -1;
  let minF = Infinity;
  let minC = Infinity;
  for (const dir of Object.keys(hoja)) {
    if (dir[0] === '!' || !celdaConContenido(hoja[dir])) continue;
    const { r, c } = XLSX.utils.decode_cell(dir);
    if (r > maxF) maxF = r;
    if (c > maxC) maxC = c;
    if (r < minF) minF = r;
    if (c < minC) minC = c;
  }
  return maxF < 0 ? null : { s: { r: minF, c: minC }, e: { r: maxF, c: maxC } };
}

/**
 * Busca la fila de títulos: la que tenga más celdas parecidas a los nombres conocidos.
 * Si ninguna se parece, usa la primera fila con al menos 2 textos.
 * (Recibe solo lo escrito en cada celda, sin repetir el texto de las celdas combinadas:
 * así un título combinado a lo ancho no "suma puntos" varias veces.)
 */
export function detectarFilaEncabezado(filasTexto, aliasPorCampo, maxFilas = 30) {
  let mejor = -1;
  let mejorPuntaje = 0;
  const limite = Math.min(filasTexto.length, maxFilas);
  for (let i = 0; i < limite; i++) {
    const puntaje = Object.keys(mapearColumnas(filasTexto[i], aliasPorCampo)).length;
    if (puntaje > mejorPuntaje) {
      mejor = i;
      mejorPuntaje = puntaje;
    }
  }
  if (mejorPuntaje >= 2) return mejor;
  for (let i = 0; i < limite; i++) {
    const llenas = filasTexto[i].filter((t) => t !== '');
    if (llenas.length >= 2 && llenas.every((t) => numeroDesdeTexto(t) === null)) return i;
  }
  return 0;
}

/** Hoja a leer: la pedida en config.json o, si no se pidió ninguna, la primera VISIBLE (no oculta). */
function elegirHoja(libro, pedida) {
  const nombre = limpiarTexto(pedida);
  if (nombre) {
    const encontrada = libro.SheetNames.find((n) => normalizarTexto(n) === normalizarTexto(nombre));
    if (!encontrada) {
      throw new ErrorDatos(
        'hoja',
        `No se encontró la hoja "${nombre}" en el Excel. Hojas disponibles: ${libro.SheetNames.join(', ')}.`,
      );
    }
    return encontrada;
  }
  const info = libro.Workbook?.Sheets || [];
  const oculta = (n, i) => Number((info.find((s) => s?.name === n) || info[i])?.Hidden || 0) !== 0;
  return libro.SheetNames.find((n, i) => !oculta(n, i)) ?? libro.SheetNames[0];
}

/**
 * Abre el Excel (ArrayBuffer/Uint8Array) y devuelve las columnas y filas listas para la tabla.
 *
 * @param {ArrayBuffer|Uint8Array} contenido
 * @param {object} opciones { hoja, filaEncabezado, columnas, camposObligatorios, rellenarHaciaAbajo, columnasOcultas }
 */
export function leerLibro(contenido, opciones = {}) {
  let libro;
  try {
    const bytes = contenido instanceof Uint8Array ? contenido : new Uint8Array(contenido);
    // sheetStubs: trae también las celdas "vacías"; así se detectan fórmulas sin resultado guardado.
    libro = XLSX.read(bytes, { type: 'array', cellNF: true, cellDates: false, cellStyles: false, sheetStubs: true });
  } catch (e) {
    throw new ErrorDatos('formato', 'El archivo descargado no se pudo abrir como Excel. ¿Es el archivo correcto?', e);
  }
  if (!libro.SheetNames?.length) {
    throw new ErrorDatos('formato', 'El archivo de Excel no tiene hojas.');
  }

  const hojaNombre = elegirHoja(libro, opciones.hoja);
  const hoja = libro.Sheets[hojaNombre];
  // Algunos Excel (sobre todo hechos en Mac) cuentan las fechas desde 1904 en vez de 1900.
  const date1904 = Boolean(libro.Workbook?.WBProps?.date1904);
  const aliasPorCampo = opciones.columnas || {};
  const obligatorios = opciones.camposObligatorios || [];

  const rango = limitesReales(hoja);
  if (!rango) {
    return resultadoVacio(hojaNombre, libro.SheetNames, obligatorios);
  }

  // Celdas combinadas: las celdas del bloque "ven" el valor de la celda de arriba a la izquierda.
  const origenCombinada = new Map();
  for (const m of hoja['!merges'] || []) {
    const filaFin = Math.min(m.e.r, rango.e.r);
    const colFin = Math.min(m.e.c, rango.e.c);
    for (let r = m.s.r; r <= filaFin; r++) {
      for (let c = m.s.c; c <= colFin; c++) {
        if (r !== m.s.r || c !== m.s.c) origenCombinada.set(`${r}:${c}`, XLSX.utils.encode_cell(m.s));
      }
    }
  }
  const celdaPropia = (r, c) => hoja[XLSX.utils.encode_cell({ r, c })];
  /** Lo que se ve en (r, c): la celda propia o, si está vacía dentro de un bloque combinado, la del bloque. */
  const completarConCombinada = (convertida, r, c, opc) => {
    if (convertida.t !== '') return convertida;
    const origen = origenCombinada.get(`${r}:${c}`);
    return origen ? convertirCelda(hoja[origen], opc) : convertida;
  };

  const colInicio = rango.s.c;
  const colFin = rango.e.c;
  const indicesCol = [];
  for (let c = colInicio; c <= colFin; c++) indicesCol.push(c);
  const base = { date1904 };

  // Textos de las primeras filas (para encontrar los títulos): solo lo escrito en cada celda.
  const filasTexto = [];
  for (let r = rango.s.r; r <= Math.min(rango.e.r, rango.s.r + 30); r++) {
    filasTexto.push(indicesCol.map((c) => convertirCelda(celdaPropia(r, c), base).t));
  }

  let filaEnc;
  const filaConfig = Number(opciones.filaEncabezado);
  if (opciones.filaEncabezado !== null && opciones.filaEncabezado !== '' && Number.isInteger(filaConfig) && filaConfig >= 1) {
    filaEnc = filaConfig - 1;
    if (filaEnc > rango.e.r) {
      throw new ErrorDatos(
        'formato',
        `config.json dice que los títulos están en la fila ${filaConfig}, pero el Excel solo tiene ${rango.e.r + 1} filas.`,
      );
    }
  } else {
    filaEnc = rango.s.r + detectarFilaEncabezado(filasTexto, aliasPorCampo);
  }

  const titulosCrudos = indicesCol.map((c) => completarConCombinada(convertirCelda(celdaPropia(filaEnc, c), base), filaEnc, c, base).t);

  // Columnas que no se muestran (config "columnasOcultas", ej. monto y moneda). Para los campos de la app
  // se prefieren las demás columnas; si una de estas termina siendo un campo (código, cliente…), sí se muestra.
  const palabrasOcultas = (Array.isArray(opciones.columnasOcultas) ? opciones.columnasOcultas : [])
    .map(normalizarEncabezado)
    .filter(Boolean);
  const pareceOculta = titulosCrudos.map((t) => esTituloOculto(normalizarEncabezado(t), palabrasOcultas));

  // Qué columna es cada campo (posiciones dentro de indicesCol).
  const mapaCrudo = mapearColumnas(titulosCrudos, aliasPorCampo, pareceOculta);
  const campoDeIndice = {};
  for (const [campo, i] of Object.entries(mapaCrudo)) campoDeIndice[i] = campo;
  const ocultas = new Set(indicesCol.map((_, i) => i).filter((i) => pareceOculta[i] && !(i in campoDeIndice)));
  const visible = (i) => !ocultas.has(i);
  const opcionesCol = indicesCol.map((_, i) => ({ date1904, esIdentificador: CAMPOS_IDENTIFICADOR.has(campoDeIndice[i]) }));

  // Filas de datos.
  const filasCrudas = [];
  let filasVacias = 0;
  let encabezadosRepetidos = 0;
  let formulasSinCalcular = 0;
  let celdasConError = 0;
  for (let r = filaEnc + 1; r <= rango.e.r; r++) {
    const propias = indicesCol.map((c) => celdaPropia(r, c));
    formulasSinCalcular += propias.filter((x, i) => visible(i) && esFormulaSinValor(x)).length;
    const convertidas = propias.map((x, i) => convertirCelda(x, opcionesCol[i]));
    // ¿Fila vacía? Se mira solo lo escrito en la propia fila, no lo que "pone" un bloque combinado.
    // Una fila que solo tiene datos en columnas ocultas también cuenta como vacía (no se vería nada).
    if (convertidas.every((x, i) => !visible(i) || x.t === '')) {
      filasVacias++;
      continue;
    }
    const celdas = convertidas.map((x, i) => completarConCombinada(x, r, indicesCol[i], opcionesCol[i]));
    // Si el bot volvió a pegar la fila de títulos, se salta.
    if (celdas.every((x, i) => x.t === titulosCrudos[i])) {
      encabezadosRepetidos++;
      continue;
    }
    celdasConError += convertidas.filter((x, i) => visible(i) && x.e).length;
    filasCrudas.push({ id: r + 1, celdas });
  }

  // Celdas vacías debajo de un centro (sin combinar): la orden pertenece al centro de la fila de arriba.
  const filasRellenadas = rellenarHaciaAbajo(filasCrudas, mapaCrudo, opciones.rellenarHaciaAbajo);

  // Columnas: se descartan las ocultas y las que no tienen título NI datos.
  const conservar = indicesCol
    .map((c, i) => i)
    .filter((i) => visible(i) && (titulosCrudos[i] !== '' || filasCrudas.some((f) => f.celdas[i].t !== '')));
  const posicion = new Map(conservar.map((i, pos) => [i, pos]));
  const mapa = {};
  for (const [campo, i] of Object.entries(mapaCrudo)) {
    if (posicion.has(i)) mapa[campo] = posicion.get(i);
  }

  const vistos = new Map();
  const titulos = conservar.map((i) => {
    let titulo = titulosCrudos[i] || `Columna ${letraColumna(indicesCol[i])}`;
    const clave = normalizarEncabezado(titulo);
    const n = (vistos.get(clave) || 0) + 1;
    vistos.set(clave, n);
    if (n > 1) titulo = `${titulo} (${n})`;
    return titulo;
  });

  const campoDeColumna = {};
  for (const [campo, pos] of Object.entries(mapa)) campoDeColumna[pos] = campo;

  const columnas = conservar.map((i, pos) => {
    const campo = campoDeColumna[pos] || null;
    return {
      indice: pos,
      letra: letraColumna(indicesCol[i]),
      titulo: titulos[pos],
      campo,
      clave: campo || `col-${normalizarEncabezado(titulos[pos]).replace(/ /g, '-') || pos}`,
    };
  });

  const filas = filasCrudas.map((f) => {
    const celdas = conservar.map((i) => f.celdas[i]);
    const campos = {};
    for (const campo of CAMPOS) {
      const celda = campo in mapa ? celdas[mapa[campo]] : null;
      // Un error (#N/A) se ve en la tabla, pero no cuenta como código/cliente: no agrupa ni aparece en la lista.
      campos[campo] = celda && !celda.e ? celda.t : '';
    }
    return prepararFila({ id: f.id, celdas, campos });
  });

  // Columnas casi todas numéricas (o de fechas) se alinean a la derecha (como en Excel).
  for (const col of columnas) {
    let llenas = 0;
    let numeros = 0;
    for (const f of filas) {
      const c = f.celdas[col.indice];
      if (c.t !== '') {
        llenas++;
        if (typeof c.v === 'number') numeros++;
      }
    }
    col.tipo = llenas > 0 && numeros / llenas >= 0.8 ? 'numero' : 'texto';
  }

  const faltantes = obligatorios
    .filter((campo) => !(campo in mapa))
    .map((campo) => ({ campo, nombre: NOMBRES_CAMPOS[campo] || campo }));

  return {
    hoja: hojaNombre,
    hojas: libro.SheetNames.slice(),
    filaEncabezado: filaEnc + 1,
    columnas,
    filas,
    mapa,
    faltantes,
    filasVacias,
    encabezadosRepetidos,
    filasRellenadas,
    formulasSinCalcular,
    celdasConError,
    // Para "Columnas detectadas en el Excel": qué columnas se ocultaron.
    columnasOcultas: [...ocultas].map((i) => ({ letra: letraColumna(indicesCol[i]), titulo: titulosCrudos[i] })),
  };
}

/**
 * "Rellenar hacia abajo": si una fila tiene orden pero NO tiene código ni descripción del centro,
 * copia de la fila de arriba los campos indicados (por defecto código, descripción y cliente).
 * Es lo que haría una persona al leer un Excel donde el centro se escribe una sola vez.
 * Devuelve cuántas filas se completaron.
 */
function rellenarHaciaAbajo(filas, mapa, campos) {
  const rellenar = (Array.isArray(campos) ? campos : []).filter((c) => c in mapa);
  const delCentro = ['codigoCentro', 'descripcionCentro'].filter((c) => c in mapa);
  if (!rellenar.length || !delCentro.length || !('ordenCompra' in mapa)) return 0;
  let completadas = 0;
  let anterior = null;
  for (const fila of filas) {
    const sinCentro = delCentro.every((c) => fila.celdas[mapa[c]].t === '');
    const conOrden = fila.celdas[mapa.ordenCompra].t !== '';
    if (anterior && sinCentro && conOrden) {
      let copio = false;
      for (const campo of rellenar) {
        const i = mapa[campo];
        if (fila.celdas[i].t === '' && anterior.celdas[i].t !== '') {
          fila.celdas[i] = anterior.celdas[i];
          copio = true;
        }
      }
      if (copio) completadas++;
    }
    anterior = fila;
  }
  return completadas;
}

function resultadoVacio(hoja, hojas, obligatorios) {
  return {
    hoja,
    hojas: hojas.slice(),
    filaEncabezado: null,
    columnas: [],
    filas: [],
    mapa: {},
    faltantes: obligatorios.map((campo) => ({ campo, nombre: NOMBRES_CAMPOS[campo] || campo })),
    filasVacias: 0,
    encabezadosRepetidos: 0,
    filasRellenadas: 0,
    formulasSinCalcular: 0,
    celdasConError: 0,
    columnasOcultas: [],
  };
}

/**
 * Descarga el Excel según config.datos.
 * Devuelve { contenido: ArrayBuffer, modificado: Date|null, nombre, eTag }
 * (+ driveId, itemId y origen cuando viene de SharePoint/OneDrive).
 *
 * @param {object} config         configuración completa
 * @param {function} obtenerToken  async () => token de acceso (solo modo "graph")
 */
export async function descargarExcel(config, obtenerToken, fetchFn = globalThis.fetch) {
  const datos = config.datos || {};
  if (datos.fuente === 'graph') {
    return descargarDesdeGraph(datos, obtenerToken, fetchFn);
  }
  return descargarArchivoLocal(datos.rutaLocal, fetchFn);
}

async function descargarArchivoLocal(ruta, fetchFn) {
  let respuesta;
  try {
    respuesta = await fetchFn(ruta, { cache: 'no-store' });
  } catch (e) {
    throw new ErrorDatos('sin-red', 'No hay conexión: no se pudo descargar el Excel. Revisa tu internet y vuelve a intentar.', e);
  }
  if (respuesta.status === 404) {
    throw new ErrorDatos('no-encontrado', `No se encontró el archivo de Excel (${ruta}).`);
  }
  if (!respuesta.ok) {
    throw new ErrorDatos('otro', `No se pudo descargar el Excel (código ${respuesta.status}).`);
  }
  const ultimaMod = respuesta.headers.get('last-modified');
  const fecha = ultimaMod ? new Date(ultimaMod) : null;
  return {
    contenido: await respuesta.arrayBuffer(),
    modificado: fecha && !Number.isNaN(fecha.getTime()) ? fecha : null,
    nombre: String(ruta).split('/').pop(),
    eTag: respuesta.headers.get('etag') || null,
  };
}
