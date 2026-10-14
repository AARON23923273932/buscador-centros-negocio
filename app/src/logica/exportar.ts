// =============================================================================
// exportar.ts — Descarga en Excel (.xlsx) lo que se está viendo (con filtros).
//
// Las fechas y los números se exportan como fechas y números de verdad (con su
// formato), para que en Excel se puedan ordenar, filtrar y sumar.
// =============================================================================

// Se importa la versión ESM (xlsx.mjs) para que el navegador y las pruebas usen exactamente lo mismo.
import * as XLSX from 'xlsx/xlsx.mjs';
import type { CellObject, WorkBook, WorkSheet } from 'xlsx/xlsx.mjs';
import type { Celda, Columna, Grupo } from './tipos.ts';

/** Lo mínimo de una columna, una fila y un grupo que hace falta para exportar. */
export type ColumnaExportable = Pick<Columna, 'indice' | 'titulo'>;
export interface FilaExportable {
  celdas: ReadonlyArray<Partial<Celda> | undefined>;
}
export type GrupoExportable = Pick<Grupo, 'codigo' | 'descripcion' | 'clientes' | 'ordenes'>;

/** Valor de una celda del Excel exportado. */
type ValorExportado = string | number | CellObject;

const dos = (n: number): string => String(n).padStart(2, '0');

/** "centros-de-negocio_2026-10-09_1432.xlsx" */
export function nombreArchivoExportacion(fecha: Date = new Date()): string {
  const dia = `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
  const hora = `${dos(fecha.getHours())}${dos(fecha.getMinutes())}`;
  return `centros-de-negocio_${dia}_${hora}.xlsx`;
}

/** Ancho de columna aproximado según el texto más largo (máx. 60 caracteres). */
function anchos(textos: readonly (readonly unknown[])[]): { wch: number }[] {
  const columnas = textos[0]?.length || 0;
  const resultado: { wch: number }[] = [];
  for (let c = 0; c < columnas; c++) {
    let max = 8;
    for (const fila of textos) max = Math.max(max, String(fila[c] ?? '').length + 2);
    resultado.push({ wch: Math.min(max, 60) });
  }
  return resultado;
}

/**
 * Celda lista para SheetJS. Números y fechas van como número con su formato
 * (ej. { t: 'n', v: 46096, z: 'dd/mm/yyyy' } se ve en Excel como 15/03/2026).
 * Lo demás va como texto (así no se pierden los ceros a la izquierda de los códigos).
 */
function celdaExportable(celda: Partial<Celda> | undefined): ValorExportado {
  if (!celda) return '';
  if (typeof celda.v === 'number') return celda.z ? { t: 'n', v: celda.v, z: celda.z } : celda.v;
  return celda.v ?? '';
}

/** @param valores matriz para el Excel  @param textos lo que se ve (para calcular anchos) */
function hojaDesdeMatriz(valores: ValorExportado[][], textos: readonly (readonly unknown[])[] = valores): WorkSheet {
  const hoja = XLSX.utils.aoa_to_sheet(valores);
  hoja['!cols'] = anchos(textos);
  if (valores.length > 0 && valores[0].length > 0) {
    // Deja el filtro de Excel activado en la fila de títulos.
    hoja['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: valores.length - 1, c: valores[0].length - 1 } }),
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
    valores.push(columnas.map((c) => celdaExportable(fila.celdas[c.indice])));
    textos.push(columnas.map((c) => fila.celdas[c.indice]?.t ?? ''));
  }
  XLSX.utils.book_append_sheet(libro, hojaDesdeMatriz(valores, textos), 'Órdenes');

  if (grupos) {
    const resumen: ValorExportado[][] = [['Código', 'Descripción', 'Cliente(s)', 'N° de órdenes']];
    for (const g of grupos) resumen.push([g.codigo, g.descripcion, g.clientes.join(', '), g.ordenes]);
    XLSX.utils.book_append_sheet(libro, hojaDesdeMatriz(resumen), 'Por centro');
  }
  return libro;
}

/** Descarga el archivo en el navegador. Devuelve el nombre usado. */
export function exportarExcel(
  columnas: readonly ColumnaExportable[],
  filas: readonly FilaExportable[],
  grupos: readonly GrupoExportable[] | null = null,
  fecha: Date = new Date(),
): string {
  const nombre = nombreArchivoExportacion(fecha);
  XLSX.writeFile(construirLibroExportacion(columnas, filas, grupos), nombre, { compression: true });
  return nombre;
}
