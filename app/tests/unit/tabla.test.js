import { describe, expect, it } from 'vitest';
import { agruparPorCentro, paginar, prepararFila } from '../../src/filtros.js';
import { htmlCelda, htmlPaginacion, htmlTablaCentros, htmlTablaOrdenes, textoContador } from '../../src/tabla.js';
import { filaDePrueba } from './ayuda.js';

const COLUMNAS = [
  { indice: 0, letra: 'A', titulo: 'Código', campo: 'codigoCentro', clave: 'codigoCentro', tipo: 'texto' },
  { indice: 1, letra: 'B', titulo: 'Descripción', campo: 'descripcionCentro', clave: 'descripcionCentro', tipo: 'texto' },
  { indice: 2, letra: 'C', titulo: 'Cliente <b>', campo: 'cliente', clave: 'cliente', tipo: 'texto' },
];
const MALICIOSO = '<img src=x onerror="alert(1)">';
const FILAS = [
  filaDePrueba(3, { codigoCentro: 'CN-"1"', descripcionCentro: MALICIOSO, cliente: 'Demo & Cía' }),
  filaDePrueba(4, { codigoCentro: 'CN-"1"', descripcionCentro: 'Otra', cliente: 'Demo & Cía' }),
].map(prepararFila);

describe('htmlTablaOrdenes', () => {
  const html = htmlTablaOrdenes({
    columnas: COLUMNAS,
    filas: FILAS,
    terminosDe: () => ['img'],
    ordenarPor: 'cliente',
    direccion: 'desc',
  });
  it('escapa todo dato del Excel (incluidos títulos y atributos)', () => {
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;<mark>img</mark> src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(html).toContain('data-copiar="CN-&quot;1&quot;"');
    expect(html).toContain('Demo &amp; Cía');
  });
  it('marca la columna ordenada con aria-sort', () => {
    expect(html).toMatch(/aria-sort="descending"[^>]*>\s*<button[^>]*data-orden="cliente"/);
    expect((html.match(/aria-sort="none"/g) || []).length).toBe(2);
  });
  it('muestra un mensaje si no hay resultados', () => {
    const vacia = htmlTablaOrdenes({ columnas: COLUMNAS, filas: [], terminosDe: () => [], ordenarPor: '', direccion: 'asc' });
    expect(vacia).toContain('No hay resultados');
  });
});

describe('htmlCelda', () => {
  it('la celda de código lleva botón para copiar', () => {
    expect(htmlCelda(COLUMNAS[0], { t: 'CN-0001' }, [])).toContain('aria-label="Copiar código CN-0001"');
    expect(htmlCelda(COLUMNAS[1], { t: 'x' }, [])).toBe('x');
  });
});

describe('htmlTablaCentros', () => {
  const grupos = agruparPorCentro(FILAS);
  it('una fila por centro y detalle solo si está expandido', () => {
    const cerrado = htmlTablaCentros({
      grupos,
      columnas: COLUMNAS,
      terminos: [],
      terminosDe: () => [],
      expandidos: new Set(),
      ordenarPor: '',
      direccion: 'asc',
    });
    expect(cerrado).toContain('aria-expanded="false"');
    expect(cerrado).not.toContain('fila-detalle');
    expect(cerrado).not.toContain('<img');

    const abierto = htmlTablaCentros({
      grupos,
      columnas: COLUMNAS,
      terminos: [],
      terminosDe: () => [],
      expandidos: new Set([grupos[0].clave]),
      ordenarPor: 'ordenes',
      direccion: 'asc',
    });
    expect(abierto).toContain('aria-expanded="true"');
    expect(abierto).toContain('fila-detalle');
    expect((abierto.match(/data-fila=/g) || []).length).toBe(2);
    expect(abierto).not.toContain('<img');
  });
  it('el filtro "Descripción" se resalta también en la fila del centro (igual que en la vista por orden)', () => {
    const filas = [filaDePrueba(5, { codigoCentro: 'CN-9', descripcionCentro: 'Óptica demo', cliente: 'Demo' })].map(prepararFila);
    const porCampo = { descripcionCentro: 'optica' };
    const html = htmlTablaCentros({
      grupos: agruparPorCentro(filas),
      columnas: COLUMNAS,
      terminos: [],
      terminosDe: (col) => (col.campo && porCampo[col.campo] ? [porCampo[col.campo]] : []),
      expandidos: new Set(),
      ordenarPor: '',
      direccion: 'asc',
    });
    expect(html).toContain('<mark>Óptica</mark> demo');
  });
});

describe('paginación y contador', () => {
  it('desactiva botones en los extremos', () => {
    const html = htmlPaginacion(paginar([1, 2, 3], 1, 2));
    expect(html).toMatch(/aria-label="Primera página" disabled/);
    expect(html).toContain('Página 1 de 2');
    expect(html).not.toMatch(/aria-label="Página siguiente" disabled/);
  });
  it('texto del contador', () => {
    expect(textoContador(paginar(Array(63).fill(0), 1, 50), 80, 'orden')).toBe(
      'Mostrando 1–50 de 63 resultados (de 80 en total)',
    );
    expect(textoContador(paginar([1], 1, 50), 30, 'centro')).toBe('Mostrando 1–1 de 1 centro (de 30 en total)');
    expect(textoContador(paginar([], 1, 50), 80, 'orden')).toBe('Sin resultados (de 80 en total)');
  });
});
