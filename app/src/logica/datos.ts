import * as XLSX from 'xlsx/xlsx.mjs';
import type { CellObject, WorkBook, WorkSheet } from 'xlsx/xlsx.mjs';
import { CAMPOS, NOMBRES_CAMPOS, normalizarTexto, prepararFila } from './filtros.ts';
import { ErrorDatos, descargarDesdeGraph } from './graph.ts';
import { en } from './listas.ts';
import { rutaPublica } from './rutas.ts';
import type { ConfigDatos } from './config.ts';
import type { ArchivoExcel, Campo, Celda, Columna, FetchFn, MapaCampos, ResultadoLectura } from './tipos.ts';

export { ErrorDatos };

const CELDA_VACIA: Readonly<Celda> = Object.freeze({ t: '', o: '', v: '' });

const CAMPOS_IDENTIFICADOR = new Set<Campo>(['codigoCentro', 'ordenCompra']);

const GRUPO_CAMPO: Readonly<Record<Campo, string>> = {
  codigoCentro: 'centro',
  descripcionCentro: 'centro',
  cliente: 'cliente',
  ordenCompra: 'orden',
  tipoOrden: 'orden',
  estado: 'estado',
};

const PALABRAS_GENERICAS = new Set(['codigo', 'cod', 'descripcion', 'desc', 'detalle', 'nombre', 'numero', 'nro', 'num']);

export type AliasPorCampo = Partial<Record<Campo, readonly string[]>>;

export function limpiarTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/\s+/g, ' ').trim();
}

export function normalizarEncabezado(valor: unknown): string {
  return normalizarTexto(valor)
    .replace(/\b([a-z])[./](?=[a-z]\b)/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const dosDigitos = (n: number): string => String(n).padStart(2, '0');

const ANIO_MIN = 1900;
const ANIO_MAX = 2100;

function claveFecha(anio: number, mes: number, dia: number, hora = 0, minuto = 0): number {
  return anio * 1e8 + mes * 1e6 + dia * 1e4 + hora * 100 + minuto;
}

function serialExcel(anio: number, mes: number, dia: number, hora = 0, minuto = 0, segundo = 0): number {
  return (Date.UTC(anio, mes - 1, dia, hora, minuto, segundo) - Date.UTC(1899, 11, 30)) / 86400000;
}

const diasDelMes = (anio: number, mes: number): number => new Date(Date.UTC(anio, mes, 0)).getUTCDate();

const HORA_TEXTO = '(?:[ T](\\d{1,2}):(\\d{2})(?::(\\d{2})(?:\\.\\d+)?)?)?';
const FECHA_DIA_PRIMERO = new RegExp(`^(\\d{1,2})([/.-])(\\d{1,2})\\2(\\d{4}|\\d{2})${HORA_TEXTO}$`);
const FECHA_ISO = new RegExp(`^(\\d{4})-(\\d{1,2})-(\\d{1,2})${HORA_TEXTO}(?:Z|[+-]\\d{2}:?\\d{2})?$`);

interface PartesFecha {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
  conHora: boolean;
}

function partesFechaTexto(texto: string): PartesFecha | null {
  let anio: number;
  let mes: number;
  let dia: number;
  let horas: (string | undefined)[];
  let m = FECHA_DIA_PRIMERO.exec(texto);
  if (m) {
    const [, d = '', separador, me = '', a = ''] = m;
    if (a.length === 2 && separador !== '/') return null;
    dia = Number(d);
    mes = Number(me);
    anio = a.length === 2 ? 2000 + Number(a) : Number(a);
    horas = m.slice(5, 8);
  } else {
    m = FECHA_ISO.exec(texto);
    if (!m) return null;
    anio = Number(m[1]);
    mes = Number(m[2]);
    dia = Number(m[3]);
    horas = m.slice(4, 7);
  }
  const [hora = 0, minuto = 0, segundo = 0] = horas.map((x) => Number(x || 0));
  if (anio < ANIO_MIN || anio > ANIO_MAX || mes < 1 || mes > 12 || dia < 1 || dia > diasDelMes(anio, mes)) return null;
  if (hora > 23 || minuto > 59 || segundo > 59) return null;
  return { anio, mes, dia, hora, minuto, segundo, conHora: horas[0] !== undefined };
}

export function fechaDesdeTexto(texto: unknown): number | null {
  const p = partesFechaTexto(String(texto ?? '').trim());
  return p ? claveFecha(p.anio, p.mes, p.dia, p.hora, p.minuto) : null;
}

const PREFIJO_MONEDA = /^(S\/\.?|US\$|\$|USD|PEN|€)\s*/i;

export function numeroDesdeTexto(texto: unknown): number | null {
  const limpio = String(texto).trim().replace(PREFIJO_MONEDA, '').replace(/\s/g, '');
  if (!/^[-+]?\d[\d.,]*$/.test(limpio)) return null;
  let s = limpio;
  const ultimaComa = s.lastIndexOf(',');
  const ultimoPunto = s.lastIndexOf('.');
  if (ultimaComa !== -1 && ultimoPunto !== -1) {
    s = ultimaComa > ultimoPunto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (ultimaComa !== -1) {
    s = /^[-+]?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatoDeNumeroTexto(texto: string): string | undefined {
  const simbolo = PREFIJO_MONEDA.exec(texto)?.[1];
  const cuerpo = texto.replace(PREFIJO_MONEDA, '');
  const base = /[.,]\d{1,2}$/.test(cuerpo) ? '#,##0.00' : /[.,]/.test(cuerpo) ? '#,##0' : '';
  if (simbolo) return `"${simbolo} "${base || '0'}`;
  return base || undefined;
}

function esFormatoFecha(formato: unknown): boolean {
  if (!formato || typeof formato !== 'string') return false;
  try {
    return Boolean(XLSX.SSF.is_date(formato));
  } catch {
    return false;
  }
}

export function partesFormato(formato: unknown): { tieneFecha: boolean; tieneHora: boolean; tieneSegundos: boolean } {
  const s = (String(formato || '').split(';')[0] ?? '')
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

interface FechaSsf {
  y: number;
  m: number;
  d: number;
  H: number;
  M: number;
  S: number;
}

function convertirFecha(celda: { v: number; z?: unknown }, date1904: boolean): Celda | null {
  const f = XLSX.SSF.parse_date_code(celda.v, { date1904 }) as FechaSsf | null;
  if (!f) return null;
  const { tieneFecha, tieneHora, tieneSegundos } = partesFormato(celda.z);
  const hora = `${dosDigitos(f.H)}:${dosDigitos(f.M)}` + (tieneSegundos ? `:${dosDigitos(f.S)}` : '');
  if (!tieneFecha) {
    return { t: hora, o: f.H * 1e4 + f.M * 100 + f.S, v: celda.v % 1, z: tieneSegundos ? 'hh:mm:ss' : 'hh:mm' };
  }
  const fecha = `${dosDigitos(f.d)}/${dosDigitos(f.m)}/${f.y}`;
  return {
    t: tieneHora ? `${fecha} ${hora}` : fecha,
    o: claveFecha(f.y, f.m, f.d, f.H, f.M),
    v: serialExcel(f.y, f.m, f.d, f.H, f.M, f.S),
    z: tieneHora ? (tieneSegundos ? 'dd/mm/yyyy hh:mm:ss' : 'dd/mm/yyyy hh:mm') : 'dd/mm/yyyy',
  };
}

function celdaDeFecha(texto: string, p: PartesFecha): Celda {
  return {
    t: texto,
    o: claveFecha(p.anio, p.mes, p.dia, p.hora, p.minuto),
    v: serialExcel(p.anio, p.mes, p.dia, p.hora, p.minuto, p.segundo),
    z: p.conHora ? 'dd/mm/yyyy hh:mm' : 'dd/mm/yyyy',
  };
}

export interface OpcionesCelda {
  date1904?: boolean;
  esIdentificador?: boolean;
}

export function convertirCelda(celda: CellObject | null | undefined, opciones: OpcionesCelda = {}): Celda {
  if (!celda || celda.t === 'z' || (celda.v === undefined && celda.w === undefined)) return CELDA_VACIA;
  const { date1904 = false, esIdentificador = false } = opciones;

  if (celda.t === 'n' && typeof celda.v === 'number') {
    const v = celda.v;
    if (esFormatoFecha(celda.z)) {
      const fecha = convertirFecha({ v, z: celda.z }, date1904);
      if (fecha) return fecha;
    }
    let texto = limpiarTexto(celda.w ?? String(v));
    if (/e[+-]/i.test(texto) && Number.isSafeInteger(v)) texto = String(v);
    if (/^-?0\d/.test(texto)) return { t: texto, o: v, v: texto };
    const r: Celda = { t: texto, o: v, v };
    if (celda.z && celda.z !== 'General') r.z = String(celda.z);
    return r;
  }

  if (celda.t === 'b') {
    const texto = celda.v ? 'Sí' : 'No';
    return { t: texto, o: texto, v: texto };
  }

  if (celda.t === 'd' && celda.v instanceof Date) {
    const d = celda.v;
    const p: PartesFecha = {
      anio: d.getFullYear(),
      mes: d.getMonth() + 1,
      dia: d.getDate(),
      hora: 0,
      minuto: 0,
      segundo: 0,
      conHora: false,
    };
    return celdaDeFecha(`${dosDigitos(p.dia)}/${dosDigitos(p.mes)}/${p.anio}`, p);
  }

  if (celda.t === 'e') {
    const texto = limpiarTexto(celda.w || '#ERROR');
    return { t: texto, o: texto, v: texto, e: true };
  }

  const texto = limpiarTexto(celda.w !== undefined && celda.t !== 's' ? celda.w : celda.v);
  if (!texto) return CELDA_VACIA;
  if (!esIdentificador) {
    const p = partesFechaTexto(texto);
    if (p) return celdaDeFecha(texto, p);
  }
  const numero = numeroDesdeTexto(texto);
  if (numero === null) return { t: texto, o: texto, v: texto };
  if (esIdentificador || /^[-+]?0\d/.test(texto.replace(PREFIJO_MONEDA, ''))) return { t: texto, o: numero, v: texto };
  const r: Celda = { t: texto, o: numero, v: numero };
  const z = formatoDeNumeroTexto(texto);
  if (z) r.z = z;
  return r;
}

function esFormulaSinValor(celda: CellObject | undefined): boolean {
  return Boolean(celda?.f) && (celda?.t === 'z' || celda?.v === undefined || (celda?.t === 's' && celda?.v === ''));
}

const sirveParaParecido = (alias: string): boolean => alias.length >= 6 || alias.includes(' ');
const sinEspacios = (s: string): string => s.replace(/ /g, '');

export function mapearColumnas(
  titulos: readonly string[],
  aliasPorCampo: AliasPorCampo | null | undefined,
  evitar: readonly boolean[] = [],
): MapaCampos {
  const normales = titulos.map(normalizarEncabezado);
  const usados = new Set<number>();
  const mapa: MapaCampos = {};
  const aliasNorm = {} as Record<Campo, string[]>;
  for (const campo of CAMPOS) {
    const lista = aliasPorCampo?.[campo];
    aliasNorm[campo] = (Array.isArray(lista) ? lista : []).map(normalizarEncabezado).filter(Boolean);
  }

  const hablaDeOtraCosa = (campo: Campo, alias: string, resto: string): boolean => {
    if (!PALABRAS_GENERICAS.has(alias)) return false;
    const r = ` ${resto.trim()} `;
    return CAMPOS.some(
      (otro) => GRUPO_CAMPO[otro] !== GRUPO_CAMPO[campo] && aliasNorm[otro].some((a) => r.includes(` ${a} `)),
    );
  };

  const reglas: ((titulo: string, alias: string, campo: Campo) => boolean)[] = [
    (titulo, alias) => titulo === alias,
    (titulo, alias) => sinEspacios(titulo) === sinEspacios(alias),
    (titulo, alias, campo) =>
      sirveParaParecido(alias) && (titulo + ' ').startsWith(alias + ' ') && !hablaDeOtraCosa(campo, alias, titulo.slice(alias.length)),
    (titulo, alias, campo) => {
      if (!sirveParaParecido(alias)) return false;
      const t = ` ${titulo} `;
      const i = t.indexOf(` ${alias} `);
      return i !== -1 && !hablaDeOtraCosa(campo, alias, t.slice(0, i) + t.slice(i + alias.length + 2));
    },
  ];

  const pasadas: ((i: number) => boolean)[] = evitar.some(Boolean) ? [(i) => !evitar[i], () => true] : [() => true];
  for (const permitida of pasadas) {
    for (const regla of reglas) {
      for (const campo of CAMPOS) {
        if (campo in mapa) continue;
        buscar: for (const alias of aliasNorm[campo]) {
          for (const [i, titulo] of normales.entries()) {
            if (!usados.has(i) && permitida(i) && titulo && regla(titulo, alias, campo)) {
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

export function esTituloOculto(tituloNormal: string, palabrasNormales: readonly string[]): boolean {
  if (!tituloNormal) return false;
  const t = ` ${tituloNormal} `;
  return palabrasNormales.some((p) => p && t.includes(` ${p} `));
}

export const letraColumna = (indice: number): string => XLSX.utils.encode_col(indice);

function celdaConContenido(celda: CellObject | undefined): boolean {
  if (!celda) return false;
  if (celda.f) return true;
  if (celda.t === 'z' || (celda.v === undefined && celda.w === undefined)) return false;
  return !(celda.t === 's' && limpiarTexto(celda.v) === '');
}

interface Rango {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

function limitesReales(hoja: WorkSheet): Rango | null {
  let maxF = -1;
  let maxC = -1;
  let minF = Infinity;
  let minC = Infinity;
  for (const dir of Object.keys(hoja)) {
    if (dir[0] === '!' || !celdaConContenido(hoja[dir] as CellObject | undefined)) continue;
    const { r, c } = XLSX.utils.decode_cell(dir);
    if (r > maxF) maxF = r;
    if (c > maxC) maxC = c;
    if (r < minF) minF = r;
    if (c < minC) minC = c;
  }
  return maxF < 0 ? null : { s: { r: minF, c: minC }, e: { r: maxF, c: maxC } };
}

export function detectarFilaEncabezado(filasTexto: readonly string[][], aliasPorCampo: AliasPorCampo | null | undefined, maxFilas = 30): number {
  let mejor = -1;
  let mejorPuntaje = 0;
  const primeras = filasTexto.slice(0, maxFilas);
  for (const [i, fila] of primeras.entries()) {
    const puntaje = Object.keys(mapearColumnas(fila, aliasPorCampo)).length;
    if (puntaje > mejorPuntaje) {
      mejor = i;
      mejorPuntaje = puntaje;
    }
  }
  if (mejorPuntaje >= 2) return mejor;
  for (const [i, fila] of primeras.entries()) {
    const llenas = fila.filter((t) => t !== '');
    if (llenas.length >= 2 && llenas.every((t) => numeroDesdeTexto(t) === null)) return i;
  }
  return 0;
}

function elegirHoja(libro: WorkBook, pedida: unknown): string {
  const nombre = limpiarTexto(pedida);
  if (nombre) {
    const encontrada = libro.SheetNames.find((n) => normalizarTexto(n) === normalizarTexto(nombre));
    if (!encontrada) {
      throw new ErrorDatos('hoja', `No se encontró la hoja "${nombre}" en el Excel. Hojas disponibles: ${libro.SheetNames.join(', ')}.`);
    }
    return encontrada;
  }
  const info = libro.Workbook?.Sheets || [];
  const oculta = (n: string, i: number) => Number((info.find((s) => s?.name === n) || info[i])?.Hidden || 0) !== 0;
  return libro.SheetNames.find((n, i) => !oculta(n, i)) ?? en(libro.SheetNames, 0);
}

export interface OpcionesLectura {
  hoja?: string;
  filaEncabezado?: number | string | null;
  columnas?: AliasPorCampo;
  camposObligatorios?: readonly Campo[];
  rellenarHaciaAbajo?: readonly Campo[];
  columnasOcultas?: readonly string[];
}

interface FilaCruda {
  id: number;
  celdas: Celda[];
}

export function leerLibro(contenido: ArrayBuffer | Uint8Array, opciones: OpcionesLectura = {}): ResultadoLectura {
  let libro: WorkBook;
  try {
    const bytes = contenido instanceof Uint8Array ? contenido : new Uint8Array(contenido);
    libro = XLSX.read(bytes, { type: 'array', cellNF: true, cellDates: false, cellStyles: false, sheetStubs: true });
  } catch (e) {
    throw new ErrorDatos('formato', 'El archivo descargado no se pudo abrir como Excel. ¿Es el archivo correcto?', e);
  }
  if (!libro.SheetNames?.length) {
    throw new ErrorDatos('formato', 'El archivo de Excel no tiene hojas.');
  }

  const hojaNombre = elegirHoja(libro, opciones.hoja);
  const hoja = libro.Sheets[hojaNombre];
  const date1904 = Boolean(libro.Workbook?.WBProps?.date1904);
  const aliasPorCampo = opciones.columnas || {};
  const obligatorios = opciones.camposObligatorios || [];

  const rango = hoja ? limitesReales(hoja) : null;
  if (!hoja || !rango) {
    return resultadoVacio(hojaNombre, libro.SheetNames, obligatorios);
  }

  const origenCombinada = new Map<string, string>();
  for (const m of (hoja['!merges'] as Rango[] | undefined) || []) {
    const filaFin = Math.min(m.e.r, rango.e.r);
    const colFin = Math.min(m.e.c, rango.e.c);
    for (let r = m.s.r; r <= filaFin; r++) {
      for (let c = m.s.c; c <= colFin; c++) {
        if (r !== m.s.r || c !== m.s.c) origenCombinada.set(`${r}:${c}`, XLSX.utils.encode_cell(m.s));
      }
    }
  }
  const celdaPropia = (r: number, c: number) => hoja[XLSX.utils.encode_cell({ r, c })] as CellObject | undefined;
  const completarConCombinada = (convertida: Celda, r: number, c: number, opc: OpcionesCelda): Celda => {
    if (convertida.t !== '') return convertida;
    const origen = origenCombinada.get(`${r}:${c}`);
    return origen ? convertirCelda(hoja[origen] as CellObject | undefined, opc) : convertida;
  };

  const colInicio = rango.s.c;
  const colFin = rango.e.c;
  const indicesCol: number[] = [];
  for (let c = colInicio; c <= colFin; c++) indicesCol.push(c);
  const base: OpcionesCelda = { date1904 };

  const filasTexto: string[][] = [];
  for (let r = rango.s.r; r <= Math.min(rango.e.r, rango.s.r + 30); r++) {
    filasTexto.push(indicesCol.map((c) => convertirCelda(celdaPropia(r, c), base).t));
  }

  let filaEnc: number;
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

  const palabrasOcultas = (Array.isArray(opciones.columnasOcultas) ? opciones.columnasOcultas : []).map(normalizarEncabezado).filter(Boolean);
  const pareceOculta = titulosCrudos.map((t) => esTituloOculto(normalizarEncabezado(t), palabrasOcultas));

  const mapaCrudo = mapearColumnas(titulosCrudos, aliasPorCampo, pareceOculta);
  const campoDeIndice = new Map<number, Campo>();
  for (const [campo, i] of Object.entries(mapaCrudo) as [Campo, number][]) campoDeIndice.set(i, campo);
  const ocultas = new Set(indicesCol.map((_, i) => i).filter((i) => pareceOculta[i] && !campoDeIndice.has(i)));
  const visible = (i: number) => !ocultas.has(i);
  const opcionesCol: OpcionesCelda[] = indicesCol.map((_, i) => {
    const campo = campoDeIndice.get(i);
    return { date1904, esIdentificador: campo !== undefined && CAMPOS_IDENTIFICADOR.has(campo) };
  });

  const filasCrudas: FilaCruda[] = [];
  let filasVacias = 0;
  let encabezadosRepetidos = 0;
  let formulasSinCalcular = 0;
  let celdasConError = 0;
  for (let r = filaEnc + 1; r <= rango.e.r; r++) {
    const propias = indicesCol.map((c) => celdaPropia(r, c));
    formulasSinCalcular += propias.filter((x, i) => visible(i) && esFormulaSinValor(x)).length;
    const convertidas = propias.map((x, i) => convertirCelda(x, opcionesCol[i]));
    if (convertidas.every((x, i) => !visible(i) || x.t === '')) {
      filasVacias++;
      continue;
    }
    const celdas = convertidas.map((x, i) => completarConCombinada(x, r, en(indicesCol, i), en(opcionesCol, i)));
    if (celdas.every((x, i) => x.t === titulosCrudos[i])) {
      encabezadosRepetidos++;
      continue;
    }
    celdasConError += convertidas.filter((x, i) => visible(i) && x.e).length;
    filasCrudas.push({ id: r + 1, celdas });
  }

  const filasRellenadas = rellenarHaciaAbajo(filasCrudas, mapaCrudo, opciones.rellenarHaciaAbajo);

  const conservar = indicesCol
    .map((_, i) => i)
    .filter((i) => visible(i) && (titulosCrudos[i] !== '' || filasCrudas.some((f) => en(f.celdas, i).t !== '')));
  const posicion = new Map(conservar.map((i, pos) => [i, pos]));
  const mapa: MapaCampos = {};
  for (const [campo, i] of Object.entries(mapaCrudo) as [Campo, number][]) {
    const pos = posicion.get(i);
    if (pos !== undefined) mapa[campo] = pos;
  }

  const vistos = new Map<string, number>();
  const titulos = conservar.map((i) => {
    let titulo = titulosCrudos[i] || `Columna ${letraColumna(en(indicesCol, i))}`;
    const clave = normalizarEncabezado(titulo);
    const n = (vistos.get(clave) || 0) + 1;
    vistos.set(clave, n);
    if (n > 1) titulo = `${titulo} (${n})`;
    return titulo;
  });

  const campoDeColumna = new Map<number, Campo>();
  for (const [campo, pos] of Object.entries(mapa) as [Campo, number][]) campoDeColumna.set(pos, campo);

  const filas = filasCrudas.map((f) => {
    const celdas = conservar.map((i) => en(f.celdas, i));
    const campos = {} as Record<Campo, string>;
    for (const campo of CAMPOS) {
      const pos = mapa[campo];
      const celda = pos !== undefined ? celdas[pos] : null;
      campos[campo] = celda && !celda.e ? celda.t : '';
    }
    return prepararFila({ id: f.id, celdas, campos });
  });

  const columnas: Columna[] = conservar.map((i, pos) => {
    const campo = campoDeColumna.get(pos) ?? null;
    let llenas = 0;
    let numeros = 0;
    for (const fila of filas) {
      const c = en(fila.celdas, pos);
      if (c.t !== '') {
        llenas++;
        if (typeof c.v === 'number') numeros++;
      }
    }
    const titulo = en(titulos, pos);
    return {
      indice: pos,
      letra: letraColumna(en(indicesCol, i)),
      titulo,
      campo,
      clave: campo || `col-${normalizarEncabezado(titulo).replace(/ /g, '-') || pos}`,
      tipo: llenas > 0 && numeros / llenas >= 0.8 ? 'numero' : 'texto',
    };
  });

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
    columnasOcultas: [...ocultas].map((i) => ({ letra: letraColumna(en(indicesCol, i)), titulo: en(titulosCrudos, i) })),
  };
}

function rellenarHaciaAbajo(filas: FilaCruda[], mapa: MapaCampos, campos: readonly Campo[] | undefined): number {
  const indice = (c: Campo): number => mapa[c] as number;
  const rellenar = (Array.isArray(campos) ? campos : []).filter((c) => c in mapa);
  const delCentro = (['codigoCentro', 'descripcionCentro'] as const).filter((c) => c in mapa);
  if (!rellenar.length || !delCentro.length || !('ordenCompra' in mapa)) return 0;
  let completadas = 0;
  let anterior: FilaCruda | null = null;
  for (const fila of filas) {
    const sinCentro = delCentro.every((c) => en(fila.celdas, indice(c)).t === '');
    const conOrden = en(fila.celdas, indice('ordenCompra')).t !== '';
    if (anterior && sinCentro && conOrden) {
      let copio = false;
      for (const campo of rellenar) {
        const i = indice(campo);
        const deArriba = en(anterior.celdas, i);
        if (en(fila.celdas, i).t === '' && deArriba.t !== '') {
          fila.celdas[i] = deArriba;
          copio = true;
        }
      }
      if (copio) completadas++;
    }
    anterior = fila;
  }
  return completadas;
}

function resultadoVacio(hoja: string, hojas: readonly string[], obligatorios: readonly Campo[]): ResultadoLectura {
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

export async function descargarExcel(
  config: { datos?: Partial<ConfigDatos> },
  obtenerToken: (() => Promise<string>) | null,
  fetchFn: FetchFn = globalThis.fetch,
): Promise<ArchivoExcel> {
  const datos = config.datos || {};
  if (datos.fuente === 'graph') {
    if (!obtenerToken) throw new ErrorDatos('sesion', 'No hay una sesión iniciada.');
    return descargarDesdeGraph(datos, obtenerToken, fetchFn);
  }
  return descargarArchivoLocal(String(datos.rutaLocal), fetchFn);
}

async function descargarArchivoLocal(ruta: string, fetchFn: FetchFn): Promise<ArchivoExcel> {
  let respuesta: Response;
  try {
    respuesta = await fetchFn(rutaPublica(ruta), { cache: 'no-store' });
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
    nombre: String(ruta).split('/').pop() || '',
    eTag: respuesta.headers.get('etag') || null,
  };
}
