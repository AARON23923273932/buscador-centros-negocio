// =============================================================================
// exportar.ts — Descarga en Excel (.xlsx) lo que se está viendo (con filtros).
//
// Las fechas y los números se exportan como fechas y números de verdad (con su
// formato), para que en Excel se puedan ordenar, filtrar y sumar.
//
// Celdas con varias órdenes ("OC 3519155 OC 3519252…", ver ordenes.ts): cada orden va en su propia línea
// DENTRO DE LA MISMA CELDA (salto de línea + "Ajustar texto"), igual que en la página. Se eligió así (y no una
// fila o una columna por orden) para que el Excel exportado tenga las mismas filas que la tabla y que el Excel
// original: el contador, los filtros y las sumas no cambian, y el texto de la celda es el mismo (solo los
// espacios entre órdenes pasan a ser saltos de línea, así que el filtro "contiene" de Excel sigue funcionando).
// SheetJS (versión gratuita) no escribe estilos de celda: "Ajustar texto" se agrega al final, en el archivo ya
// armado (ver ajustarTextoDeVariasLineas). Sin "Ajustar texto", Excel mostraría las órdenes pegadas en una línea.
// =============================================================================

// Se importa la versión ESM (xlsx.mjs) para que el navegador y las pruebas usen exactamente lo mismo.
import * as XLSX from 'xlsx/xlsx.mjs';
import type { CellObject, WorkBook, WorkSheet } from 'xlsx/xlsx.mjs';
import { separarOrdenes } from './ordenes.ts';
import type { Celda, Columna, Grupo } from './tipos.ts';

/** Lo mínimo de una columna, una fila y un grupo que hace falta para exportar. */
export type ColumnaExportable = Pick<Columna, 'indice' | 'titulo'> & Partial<Pick<Columna, 'campo'>>;
export interface FilaExportable {
  celdas: ReadonlyArray<Partial<Celda> | undefined>;
}
export type GrupoExportable = Pick<Grupo, 'codigo' | 'descripcion' | 'clientes' | 'ordenes'>;

/** Valor de una celda del Excel exportado. */
type ValorExportado = string | number | CellObject;

/**
 * Formato que marca las celdas con varias órdenes: "@" (Texto, el formato n.° 49 de Excel). Es texto de todos
 * modos; sirve para encontrar esas celdas en el archivo armado y ponerles "Ajustar texto".
 */
export const FORMATO_VARIAS_LINEAS = '@';
const ID_FORMATO_TEXTO = 49;

/** Tipo de archivo .xlsx (para la descarga). */
const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const dos = (n: number): string => String(n).padStart(2, '0');

/** "centros-de-negocio_2026-10-09_1432.xlsx" */
export function nombreArchivoExportacion(fecha: Date = new Date()): string {
  const dia = `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
  const hora = `${dos(fecha.getHours())}${dos(fecha.getMinutes())}`;
  return `centros-de-negocio_${dia}_${hora}.xlsx`;
}

/** Ancho de columna aproximado según la línea más larga de cada celda (máx. 60 caracteres). */
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

/**
 * Celda lista para SheetJS. Números y fechas van como número con su formato
 * (ej. { t: 'n', v: 46096, z: 'dd/mm/yyyy' } se ve en Excel como 15/03/2026).
 * Lo demás va como texto (así no se pierden los ceros a la izquierda de los códigos).
 * En la columna de órdenes, una celda con varias órdenes va con una orden por línea.
 */
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

/** Texto que se ve en la celda exportada (para calcular el ancho de la columna). */
const textoExportado = (valor: ValorExportado, visto: string): string =>
  typeof valor === 'object' && valor.z === FORMATO_VARIAS_LINEAS ? String(valor.v) : visto;

/** @param valores matriz para el Excel  @param textos lo que se ve (para calcular anchos) */
function hojaDesdeMatriz(valores: ValorExportado[][], textos: readonly (readonly unknown[])[] = valores): WorkSheet {
  const hoja = XLSX.utils.aoa_to_sheet(valores);
  hoja['!cols'] = anchos(textos);
  const titulos = valores[0];
  if (titulos && titulos.length > 0) {
    // Deja el filtro de Excel activado en la fila de títulos.
    hoja['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: valores.length - 1, c: titulos.length - 1 } }),
    };
  }
  return hoja;
}

/**
 * Crea el libro de Excel con las filas filtradas.
 * @param columnas  columnas de la tabla
 * @param filas     filas filtradas y ordenadas
 * @param grupos    si se pasa (vista "Por centro"), agrega una hoja de resumen por centro
 */
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

/**
 * Lo que se usa de la librería de .zip que trae SheetJS (XLSX.CFB; sus tipos dicen "any"). Un .xlsx es un .zip
 * con archivos .xml adentro: FullPaths[i] es la ruta del archivo FileIndex[i] (ej. "Root Entry/xl/styles.xml").
 */
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

/** Busca un archivo dentro del .xlsx. */
function archivoDelZip(zip: Zip, ruta: string): ArchivoZip | null {
  return zip.FileIndex.find((_, i) => zip.FullPaths[i]?.endsWith(`/${ruta}`)) ?? null;
}

/**
 * Pone "Ajustar texto" (y alineación arriba) a las celdas marcadas con FORMATO_VARIAS_LINEAS en un .xlsx ya
 * armado por SheetJS: agrega la alineación a ese estilo en xl/styles.xml. Si no hay celdas así, no cambia nada.
 */
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

/** El .xlsx (bytes) del libro, con "Ajustar texto" en las celdas de varias órdenes. */
export function archivoExportacion(libro: WorkBook): Uint8Array {
  const bytes = XLSX.write(libro, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer;
  return ajustarTextoDeVariasLineas(new Uint8Array(bytes));
}

/** Hace que el navegador descargue los bytes como un archivo. */
function descargar(bytes: Uint8Array, nombre: string): void {
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: TIPO_XLSX }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.hidden = true;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  // Se libera después: algunos navegadores empiezan la descarga un poco más tarde.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Descarga el archivo en el navegador. Devuelve el nombre usado. */
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
