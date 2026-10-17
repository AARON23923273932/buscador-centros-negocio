import * as XLSX from 'xlsx/xlsx.mjs';
import type { CellObject, WorkSheet } from 'xlsx/xlsx.mjs';
import type { CamposFila, FilaBase } from '../../src/logica/tipos.ts';

export type ValorCelda = string | number | boolean | CellObject;

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

export function crearExcelDesdeMatriz(matriz: unknown[][]): Uint8Array {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(matriz), 'Hoja1');
  return new Uint8Array(XLSX.write(libro, { type: 'array', bookType: 'xlsx' }));
}

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

interface Cfb {
  read(datos: Uint8Array, opciones: { type: 'array' }): { FullPaths: string[]; FileIndex: { content: Uint8Array; size: number }[] };
  write(zip: unknown, opciones: { type: 'array'; fileType: 'zip' }): ArrayBuffer;
}

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
