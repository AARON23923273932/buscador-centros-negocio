import * as XLSX from 'xlsx/xlsx.mjs';
import type { CellObject, WorkBook, WorkSheet } from 'xlsx/xlsx.mjs';
import { separarOrdenes } from './ordenes.ts';
import type { Celda, Columna, Grupo } from './tipos.ts';

export type ColumnaExportable = Pick<Columna, 'indice' | 'titulo'> & Partial<Pick<Columna, 'campo'>>;
export interface FilaExportable {
  celdas: ReadonlyArray<Partial<Celda> | undefined>;
}
export type GrupoExportable = Pick<Grupo, 'codigo' | 'descripcion' | 'clientes' | 'ordenes'>;

type ValorExportado = string | number | CellObject;

export const FORMATO_VARIAS_LINEAS = '@';
const ID_FORMATO_TEXTO = 49;

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const dos = (n: number): string => String(n).padStart(2, '0');

export function nombreArchivoExportacion(fecha: Date = new Date()): string {
  const dia = `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
  const hora = `${dos(fecha.getHours())}${dos(fecha.getMinutes())}`;
  return `centros-de-negocio_${dia}_${hora}.xlsx`;
}

function anchos(textos: readonly (readonly unknown[])[]): { wch: number }[] {
  const columnas = textos[0]?.length || 0;
  const resultado: { wch: number }[] = [];
  for (let c = 0; c < columnas; c++) {
    let max = 8;
    for (const fila of textos) {
      for (const linea of String(fila[c] ?? '').split('\n')) max = Math.max(max, linea.length + 2);
    }
    resultado.push({ wch: Math.min(max, 60) });
  }
  return resultado;
}

function celdaExportable(celda: Partial<Celda> | undefined, columna: ColumnaExportable): ValorExportado {
  if (!celda) return '';
  if (typeof celda.v === 'number') return celda.z ? { t: 'n', v: celda.v, z: celda.z } : celda.v;
  const valor = celda.v ?? '';
  if (columna.campo === 'ordenCompra') {
    const lineas = separarOrdenes(valor);
    if (lineas.length > 1) return { t: 's', v: lineas.join('\n'), z: FORMATO_VARIAS_LINEAS };
  }
  return valor;
}

const textoExportado = (valor: ValorExportado, visto: string): string =>
  typeof valor === 'object' && valor.z === FORMATO_VARIAS_LINEAS ? String(valor.v) : visto;

function hojaDesdeMatriz(valores: ValorExportado[][], textos: readonly (readonly unknown[])[] = valores): WorkSheet {
  const hoja = XLSX.utils.aoa_to_sheet(valores);
  hoja['!cols'] = anchos(textos);
  const titulos = valores[0];
  if (titulos && titulos.length > 0) {
    hoja['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: valores.length - 1, c: titulos.length - 1 } }),
    };
  }
  return hoja;
}

export function construirLibroExportacion(
  columnas: readonly ColumnaExportable[],
  filas: readonly FilaExportable[],
  grupos: readonly GrupoExportable[] | null = null,
): WorkBook {
  const libro = XLSX.utils.book_new();
  const titulos = columnas.map((c) => c.titulo);
  const valores: ValorExportado[][] = [titulos];
  const textos: string[][] = [titulos];
  for (const fila of filas) {
    const exportadas = columnas.map((c) => celdaExportable(fila.celdas[c.indice], c));
    valores.push(exportadas);
    textos.push(columnas.map((c, i) => textoExportado(exportadas[i] ?? '', fila.celdas[c.indice]?.t ?? '')));
  }
  XLSX.utils.book_append_sheet(libro, hojaDesdeMatriz(valores, textos), 'Órdenes');

  if (grupos) {
    const resumen: ValorExportado[][] = [['Código', 'Descripción', 'Cliente(s)', 'N° de órdenes']];
    for (const g of grupos) resumen.push([g.codigo, g.descripcion, g.clientes.join(', '), g.ordenes]);
    XLSX.utils.book_append_sheet(libro, hojaDesdeMatriz(resumen), 'Por centro');
  }
  return libro;
}

interface ArchivoZip {
  content?: Uint8Array | null;
  size?: number;
}
interface Zip {
  FileIndex: ArchivoZip[];
  FullPaths: string[];
}
const ZIP = XLSX.CFB as {
  read(datos: Uint8Array, opciones: { type: 'array' }): Zip;
  write(zip: Zip, opciones: { fileType: 'zip'; type: 'array'; compression: boolean }): ArrayLike<number>;
};

function archivoDelZip(zip: Zip, ruta: string): ArchivoZip | null {
  return zip.FileIndex.find((_, i) => zip.FullPaths[i]?.endsWith(`/${ruta}`)) ?? null;
}

export function ajustarTextoDeVariasLineas(xlsx: Uint8Array): Uint8Array {
  const zip = ZIP.read(xlsx, { type: 'array' });
  const estilos = archivoDelZip(zip, 'xl/styles.xml');
  if (!estilos?.content) return xlsx;
  const xml = new TextDecoder().decode(estilos.content);
  const estilo = new RegExp(`<xf numFmtId="${ID_FORMATO_TEXTO}"([^>]*?)/>`);
  if (!estilo.test(xml)) return xlsx;
  const nuevo = xml.replace(estilo, `<xf numFmtId="${ID_FORMATO_TEXTO}"$1 applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>`);
  estilos.content = new TextEncoder().encode(nuevo);
  estilos.size = estilos.content.length;
  return Uint8Array.from(ZIP.write(zip, { fileType: 'zip', type: 'array', compression: true }));
}

export function archivoExportacion(libro: WorkBook): Uint8Array {
  const bytes = XLSX.write(libro, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer;
  return ajustarTextoDeVariasLineas(new Uint8Array(bytes));
}

function descargar(bytes: Uint8Array, nombre: string): void {
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: TIPO_XLSX }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.hidden = true;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function exportarExcel(
  columnas: readonly ColumnaExportable[],
  filas: readonly FilaExportable[],
  grupos: readonly GrupoExportable[] | null = null,
  fecha: Date = new Date(),
): string {
  const nombre = nombreArchivoExportacion(fecha);
  descargar(archivoExportacion(construirLibroExportacion(columnas, filas, grupos)), nombre);
  return nombre;
}
