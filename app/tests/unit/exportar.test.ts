import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx/xlsx.mjs';
import { construirLibroExportacion, nombreArchivoExportacion } from '../../src/logica/exportar.ts';

const COLUMNAS = [
  { indice: 0, titulo: 'Código' },
  { indice: 1, titulo: 'N° Orden' },
  { indice: 2, titulo: 'Monto' },
];
const FILAS = [
  { id: 3, celdas: [{ v: 'CN-0001' }, { v: '0004500100' }, { v: 1250.5 }] },
  { id: 4, celdas: [{ v: 'CN-0002' }, { v: 'OS-1' }, { v: 10 }] },
];

describe('exportar', () => {
  it('nombre del archivo con fecha y hora', () => {
    expect(nombreArchivoExportacion(new Date(2026, 9, 9, 14, 5))).toBe('centros-de-negocio_2026-10-09_1405.xlsx');
  });
  it('conserva ceros a la izquierda (texto) y números (número)', () => {
    const libro = construirLibroExportacion(COLUMNAS, FILAS);
    const hoja = libro.Sheets['Órdenes'];
    expect(hoja.A1.v).toBe('Código');
    expect(hoja.B2).toMatchObject({ t: 's', v: '0004500100' });
    expect(hoja.C2).toMatchObject({ t: 'n', v: 1250.5 });
    expect(hoja['!autofilter']?.ref).toBe('A1:C3');
  });
  it('fechas y montos se exportan como fecha y número de Excel (se pueden ordenar, filtrar y sumar)', () => {
    const columnas = [
      { indice: 0, titulo: 'Fecha' },
      { indice: 1, titulo: 'Monto' },
    ];
    const filas = [
      // Así quedan después de leerLibro: fecha (número de serie + formato) y monto que venía como texto.
      { id: 2, celdas: [{ t: '15/03/2026', v: 46096, z: 'dd/mm/yyyy' }, { t: '73,748.89', v: 73748.89, z: '#,##0.00' }] },
    ];
    // Se escribe y se vuelve a leer el .xlsx, como lo abriría Excel.
    const bytes = XLSX.write(construirLibroExportacion(columnas, filas), { type: 'array', bookType: 'xlsx' });
    const hoja = XLSX.read(bytes, { type: 'array', cellNF: true }).Sheets['Órdenes'];
    expect(hoja.A2).toMatchObject({ t: 'n', v: 46096, z: 'dd/mm/yyyy', w: '15/03/2026' });
    expect(XLSX.SSF.is_date(hoja.A2.z)).toBe(true);
    expect(hoja.B2).toMatchObject({ t: 'n', v: 73748.89, z: '#,##0.00' });
  });
  it('en vista por centro agrega una hoja de resumen', () => {
    const grupos = [{ codigo: 'CN-0001', descripcion: 'X', clientes: ['A', 'B'], ordenes: 2 }];
    const libro = construirLibroExportacion(COLUMNAS, FILAS, grupos);
    expect(libro.SheetNames).toEqual(['Órdenes', 'Por centro']);
    const filas = XLSX.utils.sheet_to_json(libro.Sheets['Por centro'], { header: 1 });
    expect(filas[1]).toEqual(['CN-0001', 'X', 'A, B', 2]);
  });
});
