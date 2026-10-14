// Ayudas para las pruebas: crear un Excel en memoria.
import * as XLSX from 'xlsx/xlsx.mjs';
import type { CellObject, WorkSheet } from 'xlsx/xlsx.mjs';
import type { CamposFila, FilaBase } from '../../src/logica/tipos.ts';

/** Valor de una celda: texto/número/booleano simple o un objeto de SheetJS { t, v, z }. */
export type ValorCelda = string | number | boolean | CellObject;

/**
 * Crea un .xlsx en memoria a partir de un objeto { 'A1': celda, ... }.
 * Una celda puede ser un texto/número simple o un objeto de SheetJS { t, v, z }.
 */
export function crearExcel(
  celdas: Record<string, ValorCelda>,
  { merges = [], nombreHoja = 'Hoja1', hojasExtra = [] }: { merges?: string[]; nombreHoja?: string; hojasExtra?: string[] } = {},
): Uint8Array {
  const hoja: WorkSheet = {};
  let maxR = 0;
  let maxC = 0;
  for (const [dir, valor] of Object.entries(celdas)) {
    const { r, c } = XLSX.utils.decode_cell(dir);
    maxR = Math.max(maxR, r);
    maxC = Math.max(maxC, c);
    if (valor !== null && typeof valor === 'object') hoja[dir] = valor;
    else if (typeof valor === 'number') hoja[dir] = { t: 'n', v: valor };
    else if (typeof valor === 'boolean') hoja[dir] = { t: 'b', v: valor };
    else hoja[dir] = { t: 's', v: String(valor) };
  }
  hoja['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
  if (merges.length) hoja['!merges'] = merges.map((m) => XLSX.utils.decode_range(m));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
  for (const nombre of hojasExtra) {
    XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet([['x']]), nombre);
  }
  return new Uint8Array(XLSX.write(libro, { type: 'array', bookType: 'xlsx' }));
}

/** Crea un Excel a partir de una matriz (lista de filas). */
export function crearExcelDesdeMatriz(matriz: unknown[][]): Uint8Array {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(matriz), 'Hoja1');
  return new Uint8Array(XLSX.write(libro, { type: 'array', bookType: 'xlsx' }));
}

/** Fila mínima (sin preparar), para probar filtros sin pasar por el Excel. */
export function filaDePrueba(id: number, campos: Partial<CamposFila>, extra: string[] = []): FilaBase {
  const textos = [
    campos.codigoCentro,
    campos.descripcionCentro,
    campos.cliente,
    campos.ordenCompra,
    campos.tipoOrden,
    campos.estado,
    ...extra,
  ];
  return {
    id,
    celdas: textos.map((t) => ({ t: t ?? '', o: t ?? '', v: t ?? '' })),
    campos: {
      codigoCentro: '',
      descripcionCentro: '',
      cliente: '',
      ordenCompra: '',
      tipoOrden: '',
      estado: '',
      ...campos,
    },
  };
}

/** Lo que se usa de la librería "cfb" que trae SheetJS (lee y escribe el .zip de un .xlsx). */
interface Cfb {
  read(datos: Uint8Array, opciones: { type: 'array' }): { FullPaths: string[]; FileIndex: { content: Uint8Array; size: number }[] };
  write(zip: unknown, opciones: { type: 'array'; fileType: 'zip' }): ArrayBuffer;
}

/**
 * Cambia el XML de la primera hoja de un .xlsx ya creado (para simular Excel que SheetJS no
 * sabe escribir, por ejemplo fórmulas sin resultado guardado como las que deja openpyxl).
 */
export function cambiarXmlHoja(bytes: Uint8Array, cambiar: (xml: string) => string): Uint8Array {
  const CFB = XLSX.CFB as Cfb;
  const zip = CFB.read(bytes, { type: 'array' });
  const i = zip.FullPaths.findIndex((p) => p.endsWith('xl/worksheets/sheet1.xml'));
  const entrada = zip.FileIndex[i];
  const xml = cambiar(new TextDecoder().decode(entrada.content));
  entrada.content = new TextEncoder().encode(xml);
  entrada.size = entrada.content.length;
  return new Uint8Array(CFB.write(zip, { type: 'array', fileType: 'zip' }));
}

/** Libro con varias hojas: [{ nombre, matriz, oculta }]. Opcional: sistema de fechas 1904. */
export function crearLibro(
  hojas: { nombre: string; matriz: unknown[][]; oculta?: boolean }[],
  { date1904 = false }: { date1904?: boolean } = {},
): Uint8Array {
  const libro = XLSX.utils.book_new();
  for (const h of hojas) XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(h.matriz), h.nombre);
  libro.Workbook = {
    Sheets: hojas.map((h) => ({ name: h.nombre, Hidden: h.oculta ? 1 : 0 })),
    ...(date1904 ? { WBProps: { date1904: true } } : {}),
  };
  return new Uint8Array(XLSX.write(libro, { type: 'array', bookType: 'xlsx' }));
}
