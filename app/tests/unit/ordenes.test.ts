// Varias órdenes en una misma celda (así viene el Excel real): separarlas para mostrar una por línea,
// contarlas en "N° de órdenes" y exportarlas una por línea dentro de la misma celda (logica/ordenes.ts).
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx/xlsx.mjs';
import { ajustarTextoDeVariasLineas, archivoExportacion, construirLibroExportacion, FORMATO_VARIAS_LINEAS } from '../../src/logica/exportar.ts';
import { agruparPorCentro, filtrarFilas, prepararFila, segmentosResaltado } from '../../src/logica/filtros.ts';
import { clavesDeOrdenes, segmentosPorLinea, separarOrdenes, tieneVariasOrdenes } from '../../src/logica/ordenes.ts';
import { filaDePrueba } from './ayuda.ts';

/** Celdas reales del Excel de producción (columna "OC/OS"). */
const REAL_7 = 'OC 3519155 OC 3519252 OC N° 3519348 OC N° 3519553 OC N° 3519521 OC N° 8702 OC N° 3519670';
const REAL_MEZCLA = 'OC 533 OC N° 3519522 OC N° 3519523';

describe('separarOrdenes', () => {
  it('ejemplos reales: una orden por línea, sin cortar "OC N° 3519348"', () => {
    expect(separarOrdenes(REAL_7)).toEqual([
      'OC 3519155',
      'OC 3519252',
      'OC N° 3519348',
      'OC N° 3519553',
      'OC N° 3519521',
      'OC N° 8702',
      'OC N° 3519670',
    ]);
    expect(separarOrdenes(REAL_MEZCLA)).toEqual(['OC 533', 'OC N° 3519522', 'OC N° 3519523']);
  });

  it('una sola orden (con guiones o año) queda entera', () => {
    expect(separarOrdenes('OC 0000096690-2025')).toEqual(['OC 0000096690-2025']);
    expect(separarOrdenes('OC-0000098263-2025')).toEqual(['OC-0000098263-2025']);
    expect(separarOrdenes('OS-2026-0001')).toEqual(['OS-2026-0001']);
  });

  it('OC y OS mezcladas, en mayúsculas o minúsculas, con "Nº", "No.", "Nro.", "#" o ":"', () => {
    expect(separarOrdenes('OC 1 OS-2026-0001 oc Nº 77 Os No. 8 OC Nro. 9 OC #10 OS: 11')).toEqual([
      'OC 1',
      'OS-2026-0001',
      'oc Nº 77',
      'Os No. 8',
      'OC Nro. 9',
      'OC #10',
      'OS: 11',
    ]);
  });

  it('otras formas comunes: "N.°" / "N.º" (RAE), "OC." y "O.C." con puntos, "OC/OS" como una sola orden', () => {
    expect(separarOrdenes('OC N.° 3519348 OC N.º 3519349')).toEqual(['OC N.° 3519348', 'OC N.º 3519349']);
    expect(separarOrdenes('OC. 123 OC. 456 OS. 7')).toEqual(['OC. 123', 'OC. 456', 'OS. 7']);
    expect(separarOrdenes('O.C. 123 O.C. 456 o.s. N° 7 O. C. 8')).toEqual(['O.C. 123', 'O.C. 456', 'o.s. N° 7', 'O. C. 8']);
    expect(separarOrdenes('OC/OS 123')).toEqual(['OC/OS 123']);
    expect(separarOrdenes('OC/OS 123 OC 456')).toEqual(['OC/OS 123', 'OC 456']);
    expect(separarOrdenes('OC 1/OS 2')).toEqual(['OC 1/', 'OS 2']); // dos órdenes (cada una con su número)
    // Siguen sin cortarse: puntos dentro de otra palabra ("PRO.C 5") y "O C" sin punto.
    expect(separarOrdenes('PRO.C 5 O C 6')).toEqual(['PRO.C 5 O C 6']);
  });

  it('no pierde texto: lo de antes de la primera orden y los signos entre órdenes se conservan', () => {
    expect(separarOrdenes('Ver: OC 1, OC 2 / OS 3')).toEqual(['Ver:', 'OC 1,', 'OC 2 /', 'OS 3']);
    const lineas = separarOrdenes(REAL_7);
    expect(lineas.join(' ')).toBe(REAL_7);
  });

  it('quita los espacios de más (también saltos de línea que ya traiga la celda)', () => {
    expect(separarOrdenes('  OC   3519155 \n OC  N°   3519348  ')).toEqual(['OC 3519155', 'OC N° 3519348']);
  });

  it('"OC"/"OS" solo como palabra completa y seguido de un número', () => {
    expect(separarOrdenes('ROC 12 BLOC 5')).toEqual(['ROC 12 BLOC 5']);
    expect(separarOrdenes('OS de mantenimiento')).toEqual(['OS de mantenimiento']);
    expect(separarOrdenes('OC1OC2')).toEqual(['OC1OC2']); // la segunda va pegada a un número: no es palabra aparte
    expect(separarOrdenes('Pedido OCASO 12')).toEqual(['Pedido OCASO 12']);
  });

  it('sin órdenes reconocibles devuelve el texto tal cual; vacío → ninguna línea', () => {
    expect(separarOrdenes('0004500100')).toEqual(['0004500100']);
    expect(separarOrdenes('  sin orden aún ')).toEqual(['  sin orden aún ']);
    expect(separarOrdenes('')).toEqual([]);
    expect(tieneVariasOrdenes('OC-1')).toBe(false);
    expect(tieneVariasOrdenes(REAL_MEZCLA)).toBe(true);
  });
});

describe('contar órdenes ("N° de órdenes")', () => {
  it('cada orden de la celda cuenta; la misma orden escrita de dos formas cuenta una vez', () => {
    expect(clavesDeOrdenes(REAL_7)).toHaveLength(7);
    expect(clavesDeOrdenes('OC N° 3519348')).toEqual(clavesDeOrdenes('oc-3519348'));
    expect(clavesDeOrdenes('OC 3519348')).toEqual(clavesDeOrdenes('OC Nº 3519348'));
    expect(clavesDeOrdenes('OC 1')).not.toEqual(clavesDeOrdenes('OS 1'));
    expect(clavesDeOrdenes('Ver: OC 1')).toEqual(['oc1']); // "Ver:" no es una orden
    expect(clavesDeOrdenes('0004500100')).toEqual(['0004500100']); // sin "OC"/"OS": la celda entera, como antes
    expect(clavesDeOrdenes('')).toEqual([]);
  });

  it('con puntos, "N.°" o un texto después del número, sigue siendo la misma orden', () => {
    const clave = clavesDeOrdenes('OC 3519348');
    for (const forma of ['O.C. 3519348', 'OC. 3519348', 'OC N.° 3519348', 'oc n.º 3519348', 'OC 3519348 (parcial)', 'OC 3519348, pendiente']) {
      expect(clavesDeOrdenes(forma), forma).toEqual(clave);
    }
    expect(new Set(clavesDeOrdenes('OC 123 (parcial) OC 123')).size).toBe(1);
    expect(clavesDeOrdenes('OC-0000098263-2025')).toEqual(['oc00000982632025']); // guiones del número: fuera
    expect(clavesDeOrdenes('OC 4500123A')).not.toEqual(clavesDeOrdenes('OC 4500123B')); // letras pegadas: cuentan
    expect(clavesDeOrdenes('OC/OS 123')).toEqual(['ocos123']);
  });

  it('agruparPorCentro cuenta las órdenes separadas, sin repetir entre filas', () => {
    const filas = [
      filaDePrueba(2, { codigoCentro: 'CN-1', ordenCompra: REAL_MEZCLA }),
      filaDePrueba(3, { codigoCentro: 'CN-1', ordenCompra: 'OC N° 3519522' }), // repetida (escrita igual)
      filaDePrueba(4, { codigoCentro: 'CN-1', ordenCompra: 'OC 533' }), // repetida
      filaDePrueba(5, { codigoCentro: 'CN-2', ordenCompra: REAL_7 }),
      filaDePrueba(6, { codigoCentro: 'CN-3', ordenCompra: '' }),
    ].map(prepararFila);
    expect(agruparPorCentro(filas).map((g) => [g.codigo, g.ordenes])).toEqual([
      ['CN-1', 3],
      ['CN-2', 7],
      ['CN-3', 0],
    ]);
  });

  it('el buscador y el filtro "Orden" siguen buscando en el texto completo de la celda', () => {
    const filas = [filaDePrueba(2, { codigoCentro: 'CN-1', ordenCompra: REAL_7 })].map(prepararFila);
    expect(filtrarFilas(filas, { q: '3519348' })).toHaveLength(1);
    expect(filtrarFilas(filas, { orden: 'OC N° 8702' })).toHaveLength(1);
    expect(filtrarFilas(filas, { q: '3519155 OC 3519252' })).toHaveLength(1); // cruza de una orden a otra
  });
});

describe('resaltado repartido entre las líneas', () => {
  const resaltar = (texto: string, terminos: string[]) => {
    const lineas = separarOrdenes(texto);
    return segmentosPorLinea(lineas, segmentosResaltado(lineas.join(' '), terminos)).map((linea) =>
      linea.map((s) => (s.marcado ? `[${s.texto}]` : s.texto)).join(''),
    );
  };

  it('marca dentro de la línea de cada orden', () => {
    expect(resaltar(REAL_MEZCLA, ['3519522'])).toEqual(['OC 533', 'OC N° [3519522]', 'OC N° 3519523']);
    expect(resaltar(REAL_MEZCLA, ['351952'])).toEqual(['OC 533', 'OC N° [351952]2', 'OC N° [351952]3']);
  });

  it('lo buscado que cruza de una orden a la siguiente se marca en las dos líneas', () => {
    expect(resaltar('OC 1 OC 22', ['1 oc'])).toEqual(['OC [1]', '[OC] 22']);
  });

  it('sin términos: cada línea sin marcas; el texto de las líneas es el de separarOrdenes', () => {
    expect(resaltar(REAL_7, [])).toEqual(separarOrdenes(REAL_7));
  });
});

describe('exportar: una orden por línea dentro de la misma celda, con "Ajustar texto"', () => {
  const COLUMNAS = [
    { indice: 0, titulo: 'Código', campo: 'codigoCentro' as const },
    { indice: 1, titulo: 'OC/OS', campo: 'ordenCompra' as const },
    { indice: 2, titulo: 'Descripción', campo: 'descripcionCentro' as const },
  ];
  const FILAS = [
    { celdas: [{ t: 'CN-1', v: 'CN-1' }, { t: REAL_MEZCLA, v: REAL_MEZCLA }, { t: 'OC 1 OC 2 en otra columna', v: 'OC 1 OC 2 en otra columna' }] },
    { celdas: [{ t: 'CN-2', v: 'CN-2' }, { t: 'OC-0000098263-2025', v: 'OC-0000098263-2025' }, { t: 'x', v: 'x' }] },
  ];

  it('la celda lleva las órdenes separadas por saltos de línea (misma fila, mismo texto)', () => {
    const hoja = construirLibroExportacion(COLUMNAS, FILAS).Sheets['Órdenes']!;
    expect(hoja.B2).toMatchObject({ t: 's', v: 'OC 533\nOC N° 3519522\nOC N° 3519523', z: FORMATO_VARIAS_LINEAS });
    expect(hoja.B3).toMatchObject({ t: 's', v: 'OC-0000098263-2025' }); // una sola orden: tal cual
    expect(hoja.B3?.z).toBeUndefined();
    expect(hoja.C2?.v).toBe('OC 1 OC 2 en otra columna'); // solo se separa la columna de órdenes
    // El ancho de la columna es el de la orden más larga, no el de todo el texto.
    expect(hoja['!cols']?.[1]?.wch).toBe('OC-0000098263-2025'.length + 2);
  });

  it('en el archivo .xlsx esas celdas tienen "Ajustar texto" (y las demás no)', () => {
    const bytes = archivoExportacion(construirLibroExportacion(COLUMNAS, FILAS));
    const zip = XLSX.CFB.read(bytes, { type: 'array' });
    const leer = (ruta: string) =>
      new TextDecoder().decode(zip.FileIndex[zip.FullPaths.findIndex((p: string) => p.endsWith(ruta))].content as Uint8Array);
    const estilos = leer('xl/styles.xml');
    const xfs = [...estilos.slice(estilos.indexOf('<cellXfs'), estilos.indexOf('</cellXfs>')).matchAll(/<xf [^>]*?(?:\/>|>.*?<\/xf>)/g)].map((m) => m[0]);
    const conAjuste = xfs.findIndex((xf) => xf.includes('wrapText="1"'));
    expect(xfs[conAjuste]).toContain('numFmtId="49"');
    expect(xfs[conAjuste]).toContain('vertical="top"');
    expect(xfs.filter((xf) => xf.includes('wrapText'))).toHaveLength(1);
    // B2 (varias órdenes) usa ese estilo; B3 (una sola) no.
    const hoja = leer('xl/worksheets/sheet1.xml');
    expect(hoja).toMatch(new RegExp(`<c r="B2" s="${conAjuste}"`));
    expect(hoja).not.toMatch(new RegExp(`<c r="B3" s="${conAjuste}"`));
    // Excel lo vuelve a leer igual: mismo texto con los saltos de línea.
    const libro = XLSX.read(bytes, { type: 'array' });
    expect(libro.Sheets['Órdenes']!.B2!.v).toBe('OC 533\nOC N° 3519522\nOC N° 3519523');
  });

  it('sin celdas de varias órdenes el archivo no se toca', () => {
    const bytes = new Uint8Array(XLSX.write(construirLibroExportacion(COLUMNAS, [FILAS[1]!]), { type: 'array', bookType: 'xlsx' }));
    expect(ajustarTextoDeVariasLineas(bytes)).toBe(bytes);
  });
});
