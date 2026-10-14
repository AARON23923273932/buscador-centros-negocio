import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { CONFIG_POR_DEFECTO } from '../../src/logica/config.ts';
import {
  convertirCelda,
  descargarExcel,
  detectarFilaEncabezado,
  ErrorDatos,
  fechaDesdeTexto,
  leerLibro,
  limpiarTexto,
  esTituloOculto,
  mapearColumnas,
  normalizarEncabezado,
  numeroDesdeTexto,
  partesFormato,
} from '../../src/logica/datos.ts';
import { agruparPorCentro, filtrarFilas, ordenarFilas, valoresUnicos } from '../../src/logica/filtros.ts';
import { cambiarXmlHoja, crearExcel, crearExcelDesdeMatriz, crearLibro } from './ayuda.ts';

const OPCIONES = {
  columnas: CONFIG_POR_DEFECTO.columnas,
  camposObligatorios: CONFIG_POR_DEFECTO.camposObligatorios,
  rellenarHaciaAbajo: CONFIG_POR_DEFECTO.datos.rellenarHaciaAbajo,
};

describe('limpieza de textos', () => {
  it('quita espacios de más (incluye espacio duro)', () => {
    expect(limpiarTexto('  Cliente\u00a0 Demo   B  ')).toBe('Cliente Demo B');
    expect(limpiarTexto(null)).toBe('');
  });
  it('normaliza encabezados', () => {
    expect(normalizarEncabezado('N° Orden')).toBe('n orden');
    expect(normalizarEncabezado('Nº  de Órden / Servicio')).toBe('n de orden servicio');
    expect(normalizarEncabezado('Descripción del Centro de Negocio')).toBe('descripcion del centro de negocio');
  });
  it('junta las siglas con puntos o barra ("O.C." -> "oc")', () => {
    expect(normalizarEncabezado('Nro. O.C.')).toBe('nro oc');
    expect(normalizarEncabezado('N° O.C.')).toBe('n oc');
    expect(normalizarEncabezado('O/C')).toBe('oc');
    expect(normalizarEncabezado('O.C. / O.S.')).toBe('oc os');
    expect(normalizarEncabezado('Código C.N.')).toBe('codigo cn');
  });
});

describe('numeroDesdeTexto y fechaDesdeTexto', () => {
  it('reconoce números guardados como texto', () => {
    expect(numeroDesdeTexto('1,250.50')).toBe(1250.5);
    expect(numeroDesdeTexto('1.250,50')).toBe(1250.5);
    expect(numeroDesdeTexto('S/ 2,000')).toBe(2000);
    expect(numeroDesdeTexto('0004500123')).toBe(4500123);
    expect(numeroDesdeTexto('12,5')).toBe(12.5);
    expect(numeroDesdeTexto('CN-0001')).toBeNull();
    expect(numeroDesdeTexto('abc')).toBeNull();
  });
  it('reconoce fechas escritas como texto', () => {
    expect(fechaDesdeTexto('15/03/2026')).toBe(202603150000);
    expect(fechaDesdeTexto('15-03-2026 14:30')).toBe(202603151430);
    expect(fechaDesdeTexto('2026-03-15')).toBe(202603150000);
    expect(fechaDesdeTexto('45/99/2026')).toBeNull();
    expect(fechaDesdeTexto('CN-0001')).toBeNull();
  });
  it('acepta año de 2 dígitos con "/" y la hora ISO', () => {
    expect(fechaDesdeTexto('15/03/26')).toBe(202603150000);
    expect(fechaDesdeTexto('2026-03-15T14:30:00Z')).toBe(202603151430);
  });
  it('no confunde códigos con forma de fecha', () => {
    expect(fechaDesdeTexto('2026-10-00123')).toBeNull(); // sin el "$" final se leía como 2026-10-00
    expect(fechaDesdeTexto('2026-13-45')).toBeNull(); // mes 13
    expect(fechaDesdeTexto('10-01-0002')).toBeNull(); // año 0002
    expect(fechaDesdeTexto('31/02/2026')).toBeNull(); // febrero no tiene 31
    expect(fechaDesdeTexto('10-01-26')).toBeNull(); // año de 2 dígitos solo con "/"
    expect(fechaDesdeTexto('15/03-2026')).toBeNull(); // separadores distintos
  });
});

describe('convertirCelda', () => {
  it('usa el texto formateado para conservar ceros a la izquierda', () => {
    const c = convertirCelda({ t: 'n', v: 4500123, w: '0004500123', z: '0000000000' });
    expect(c).toEqual({ t: '0004500123', o: 4500123, v: '0004500123' });
  });
  it('convierte fechas guardadas como número de serie', () => {
    // 46096 = 15/03/2026
    const c = convertirCelda({ t: 'n', v: 46096, z: 'm/d/yy', w: '3/15/26' });
    expect(c.t).toBe('15/03/2026');
    expect(c.o).toBe(202603150000);
  });
  it('números normales se exportan como número (con su formato)', () => {
    expect(convertirCelda({ t: 'n', v: 1250.5, w: '1,250.50', z: '#,##0.00' })).toEqual({
      t: '1,250.50',
      o: 1250.5,
      v: 1250.5,
      z: '#,##0.00',
    });
    expect(convertirCelda({ t: 'n', v: 7, w: '7', z: 'General' })).toEqual({ t: '7', o: 7, v: 7 });
  });
  it('textos que parecen números se ordenan y se exportan como números', () => {
    expect(convertirCelda({ t: 's', v: ' 1,250.50 ' })).toEqual({ t: '1,250.50', o: 1250.5, v: 1250.5, z: '#,##0.00' });
    expect(convertirCelda({ t: 's', v: 'S/ 2,000' })).toMatchObject({ o: 2000, v: 2000, z: '"S/ "#,##0' });
    // Con ceros a la izquierda, o en una columna de códigos, siguen siendo texto al exportar.
    expect(convertirCelda({ t: 's', v: '0004500123' })).toEqual({ t: '0004500123', o: 4500123, v: '0004500123' });
    expect(convertirCelda({ t: 's', v: '4500123' }, { esIdentificador: true })).toEqual({
      t: '4500123',
      o: 4500123,
      v: '4500123',
    });
  });
  it('las fechas se exportan como fecha de Excel (número + formato)', () => {
    expect(convertirCelda({ t: 'n', v: 46096, z: 'dd/mm/yyyy' })).toEqual({
      t: '15/03/2026',
      o: 202603150000,
      v: 46096,
      z: 'dd/mm/yyyy',
    });
    // Fecha escrita como texto.
    expect(convertirCelda({ t: 's', v: '15/03/2026' })).toEqual({ t: '15/03/2026', o: 202603150000, v: 46096, z: 'dd/mm/yyyy' });
  });
  it('en columnas de códigos, un texto con forma de fecha sigue siendo texto', () => {
    const c = convertirCelda({ t: 's', v: '15-03-2026' }, { esIdentificador: true });
    expect(c).toEqual({ t: '15-03-2026', o: '15-03-2026', v: '15-03-2026' });
  });
  it('la hora se muestra solo si el formato de Excel la muestra', () => {
    // Solo hora: Excel muestra "18:00", no "00/01/1900 18:00".
    expect(convertirCelda({ t: 'n', v: 0.75, z: 'hh:mm', w: '18:00' })).toMatchObject({ t: '18:00', v: 0.75, z: 'hh:mm' });
    // Formato de solo fecha aunque el valor tenga hora.
    expect(convertirCelda({ t: 'n', v: 46097.5, z: 'dd/mm/yyyy' }).t).toBe('16/03/2026');
    expect(convertirCelda({ t: 'n', v: 46097.5, z: 'dd/mm/yyyy hh:mm' })).toMatchObject({
      t: '16/03/2026 12:00',
      z: 'dd/mm/yyyy hh:mm',
    });
  });
  it('libros con fechas desde 1904 (Excel de Mac)', () => {
    // En el sistema 1904, el 15/03/2026 se guarda como 46096 - 1462.
    const c = convertirCelda({ t: 'n', v: 46096 - 1462, z: 'dd/mm/yyyy' }, { date1904: true });
    expect(c.t).toBe('15/03/2026');
    expect(c.v).toBe(46096); // se exporta en el sistema normal (1900)
  });
  it('números largos con formato General se muestran completos (no 4.50012E+11)', () => {
    expect(convertirCelda({ t: 'n', v: 450012345678, w: '4.50012E+11' }).t).toBe('450012345678');
    expect(convertirCelda({ t: 'n', v: 20123456789, w: '20123456789' }).t).toBe('20123456789');
  });
  it('celdas vacías, booleanas y con error', () => {
    expect(convertirCelda(undefined).t).toBe('');
    expect(convertirCelda({ t: 's', v: '   ' }).t).toBe('');
    expect(convertirCelda({ t: 'b', v: true }).t).toBe('Sí');
    expect(convertirCelda({ t: 'e', v: 7, w: '#DIV/0!' })).toMatchObject({ t: '#DIV/0!', e: true });
  });
});

describe('partesFormato', () => {
  it('distingue fecha, hora y fecha con hora', () => {
    expect(partesFormato('dd/mm/yyyy')).toEqual({ tieneFecha: true, tieneHora: false, tieneSegundos: false });
    expect(partesFormato('hh:mm')).toEqual({ tieneFecha: false, tieneHora: true, tieneSegundos: false });
    expect(partesFormato('[h]:mm:ss')).toMatchObject({ tieneFecha: false, tieneSegundos: true });
    expect(partesFormato('h:mm AM/PM')).toMatchObject({ tieneFecha: false, tieneHora: true });
    expect(partesFormato('m/d/yy h:mm')).toMatchObject({ tieneFecha: true, tieneHora: true });
    expect(partesFormato('[$-F800]dddd, mmmm dd, yyyy')).toMatchObject({ tieneFecha: true, tieneHora: false });
  });
});

describe('mapearColumnas', () => {
  const alias = CONFIG_POR_DEFECTO.columnas;
  it('reconoce nombres exactos sin importar tildes', () => {
    expect(mapearColumnas(['Código', 'Descripción', 'CLIENTE', 'N° Orden', 'Tipo'], alias)).toEqual({
      codigoCentro: 0,
      descripcionCentro: 1,
      cliente: 2,
      ordenCompra: 3,
      tipoOrden: 4,
    });
  });
  it('reconoce nombres parecidos (empieza con / contiene)', () => {
    const m = mapearColumnas(['Código CN', 'Descripción del proyecto', 'Cliente final', 'Nro. Orden de Compra'], alias);
    expect(m).toEqual({ codigoCentro: 0, descripcionCentro: 1, cliente: 2, ordenCompra: 3 });
  });
  it('no confunde "Descripción del centro de negocio" con el código', () => {
    const m = mapearColumnas(['Cód. CN', 'Descripción del centro de negocio'], alias);
    expect(m.descripcionCentro).toBe(1);
    expect(m.codigoCentro).toBe(0);
  });
  it('palabras cortas solo cuentan si el título es igual', () => {
    expect(mapearColumnas(['Tipo de cambio'], alias)).toEqual({});
  });
  it('reconoce la orden de compra escrita con puntos o barra', () => {
    for (const titulo of ['Nº O.C.', 'Nro. O.C.', 'O.C.', 'O/C', 'O.C. / O.S.', 'Orden Compra', 'Número OC', 'NroOC']) {
      expect(mapearColumnas(['Código', titulo], alias), titulo).toEqual({ codigoCentro: 0, ordenCompra: 1 });
    }
  });
  it('"Código Cliente" no se toma como código del centro', () => {
    expect(mapearColumnas(['Código Cliente', 'Código C.N.', 'Descripción C.N.', 'Cliente', 'OC'], alias)).toEqual({
      codigoCentro: 1,
      descripcionCentro: 2,
      cliente: 3,
      ordenCompra: 4,
    });
    // Si no hay otra columna de código, es mejor avisar que falta que usar la del cliente.
    expect(mapearColumnas(['Código Cliente', 'Cliente'], alias)).toEqual({ cliente: 1 });
    expect(mapearColumnas(['Descripción de la orden'], alias)).toEqual({});
  });
  it('sí acepta títulos que hablan del mismo centro o de la misma orden', () => {
    expect(mapearColumnas(['Código de proyecto', 'Descripción del centro de costo'], alias)).toEqual({
      codigoCentro: 0,
      descripcionCentro: 1,
    });
    expect(mapearColumnas(['Orden de compra del cliente'], alias)).toEqual({ ordenCompra: 0 });
  });
  it('respeta la prioridad de los alias (el primero gana)', () => {
    const m = mapearColumnas(['Proyecto', 'Descripción'], alias);
    expect(m.descripcionCentro).toBe(1);
  });
});

describe('detectarFilaEncabezado', () => {
  it('encuentra la fila de títulos aunque no sea la primera', () => {
    const filas = [
      ['REPORTE DE CENTROS', '', ''],
      ['', '', ''],
      ['Código', 'Descripción', 'Cliente'],
      ['CN-1', 'algo', 'Cliente Demo'],
    ];
    expect(detectarFilaEncabezado(filas, CONFIG_POR_DEFECTO.columnas)).toBe(2);
  });
  it('un título combinado a lo ancho no le gana a la fila de títulos real', () => {
    const contenido = crearExcel(
      {
        A1: 'Reporte de Orden de Compra por Cliente',
        A3: 'CeCo',
        B3: 'Nombre CeCo',
        C3: 'Cliente',
        D3: 'OC',
        E3: 'Monto',
        A4: 'CN-1',
        B4: 'Demo',
        C4: 'Cliente Demo A',
        D4: 'OC-1',
        E4: 5,
      },
      { merges: ['A1:E1'] },
    );
    const r = leerLibro(contenido, OPCIONES);
    expect(r.filaEncabezado).toBe(3);
    expect(r.columnas.map((c) => c.titulo)).toEqual(['CeCo', 'Nombre CeCo', 'Cliente', 'OC', 'Monto']);
    expect(r.filas).toHaveLength(1);
  });
  it('si no reconoce nombres, usa la primera fila con varios textos', () => {
    const filas = [['Título'], ['Col A', 'Col B'], ['1', '2']];
    expect(detectarFilaEncabezado(filas, CONFIG_POR_DEFECTO.columnas)).toBe(1);
  });
});

describe('leerLibro — Excel "desordenado"', () => {
  const contenido = crearExcel(
    {
      A1: 'REPORTE (datos ficticios)',
      A2: 'Código',
      B2: 'Descripción',
      C2: 'Cliente',
      D2: 'N° Orden',
      E2: 'Fecha',
      F2: 'Monto',
      A3: 'CN-0001',
      B3: 'Instalación demo',
      C3: '  Cliente   Demo A  ',
      D3: { t: 'n', v: 4500123, z: '0000000000' },
      E3: { t: 'n', v: 46096, z: 'dd/mm/yyyy' },
      F3: { t: 'n', v: 1250.5, z: '#,##0.00' },
      // fila 4: combinada con la 3 en A y B
      C4: 'Cliente Demo A',
      D4: 'OS-0001',
      F4: '2,000.00',
      // fila 5 vacía
      A6: 'CN-0002',
      B6: 'Mantenimiento eléctrico',
      C6: 'Cliente Demo B',
      D6: '0004500999',
      // fila 7: el bot repitió los títulos
      A7: 'Código',
      B7: 'Descripción',
      C7: 'Cliente',
      D7: 'N° Orden',
      E7: 'Fecha',
      F7: 'Monto',
      A8: 'CN-0003',
      C8: 'Cliente Demo B',
    },
    { merges: ['A1:F1', 'A3:A4', 'B3:B4'] },
  );
  const r = leerLibro(contenido, OPCIONES);

  it('detecta los títulos en la fila 2 y salta filas vacías y títulos repetidos', () => {
    expect(r.filaEncabezado).toBe(2);
    expect(r.filas.map((f) => f.id)).toEqual([3, 4, 6, 8]);
    expect(r.filasVacias).toBe(1);
    expect(r.encabezadosRepetidos).toBe(1);
    expect(r.faltantes).toEqual([]);
  });
  it('rellena celdas combinadas', () => {
    expect(r.filas[1].campos.codigoCentro).toBe('CN-0001');
    expect(r.filas[1].campos.descripcionCentro).toBe('Instalación demo');
  });
  it('limpia espacios y conserva ceros a la izquierda', () => {
    expect(r.filas[0].campos.cliente).toBe('Cliente Demo A');
    expect(r.filas[0].campos.ordenCompra).toBe('0004500123');
    expect(r.filas[2].campos.ordenCompra).toBe('0004500999');
  });
  it('convierte fechas y números', () => {
    const fecha = r.columnas.find((c) => c.titulo === 'Fecha')!;
    const monto = r.columnas.find((c) => c.titulo === 'Monto')!;
    expect(r.filas[0].celdas[fecha.indice].t).toBe('15/03/2026');
    expect(r.filas[0].celdas[monto.indice].v).toBe(1250.5);
    expect(r.filas[1].celdas[monto.indice].o).toBe(2000);
  });
  it('agrupa por centro usando las celdas combinadas', () => {
    const g = agruparPorCentro(r.filas);
    expect(g.map((x) => [x.codigo, x.ordenes])).toEqual([
      ['CN-0001', 2],
      ['CN-0002', 1],
      ['CN-0003', 0],
    ]);
  });
});

describe('leerLibro — centro escrito una sola vez (celdas vacías SIN combinar)', () => {
  const matriz = [
    ['Código', 'Descripción', 'Cliente', 'OC', 'Nota'],
    ['CN-0001', 'Demo uno', 'Cliente Demo A', 'OC-1'],
    [null, null, null, 'OC-2'],
    [null, null, null, 'OS-3'],
    ['CN-0002', 'Demo dos', 'Cliente Demo B', 'OC-4'],
    [null, null, null, 'OC-5'],
    [null, null, null, null, 'nota sin orden'],
  ];
  it('las órdenes de abajo se completan con el centro de la fila de arriba', () => {
    const r = leerLibro(crearExcelDesdeMatriz(matriz), OPCIONES);
    expect(r.filasRellenadas).toBe(3);
    const grupos = agruparPorCentro(r.filas);
    expect(grupos.map((g) => [g.codigo, g.ordenes, g.filas.map((f) => f.id)])).toEqual([
      ['CN-0001', 3, [2, 3, 4]],
      ['CN-0002', 2, [5, 6]],
      ['', 0, [7]], // fila sin orden: no se completa (podría ser una nota o un total)
    ]);
    expect(filtrarFilas(r.filas, { codigo: 'CN-0001' }).map((f) => f.id)).toEqual([2, 3, 4]);
    expect(filtrarFilas(r.filas, { cliente: 'Cliente Demo B' }).map((f) => f.id)).toEqual([5, 6]);
    // También se ve en la tabla.
    expect(r.filas[1].celdas[0].t).toBe('CN-0001');
  });
  it('se puede desactivar con rellenarHaciaAbajo: []', () => {
    const r = leerLibro(crearExcelDesdeMatriz(matriz), { ...OPCIONES, rellenarHaciaAbajo: [] });
    expect(r.filasRellenadas).toBe(0);
    expect(r.filas[1].campos.codigoCentro).toBe('');
  });
});

describe('leerLibro — más casos raros del Excel', () => {
  it('una fila vacía dentro de un bloque combinado no cuenta como resultado', () => {
    const contenido = crearExcel(
      {
        A1: 'Código',
        B1: 'Descripción',
        C1: 'Cliente',
        D1: 'OC',
        A2: 'CN-1',
        B2: 'Demo uno',
        C2: 'Cliente Demo A',
        D2: 'OC-1',
        C4: 'Cliente Demo A',
        D4: 'OC-2',
        A5: 'CN-2',
        B5: 'Demo dos',
        C5: 'Cliente Demo B',
        D5: 'OC-3',
      },
      { merges: ['A2:A4', 'B2:B4'] },
    );
    const r = leerLibro(contenido, OPCIONES);
    expect(r.filasVacias).toBe(1);
    expect(r.filas.map((f) => f.id)).toEqual([2, 4, 5]);
    expect(agruparPorCentro(r.filas).map((g) => [g.codigo, g.filas.length])).toEqual([
      ['CN-1', 2],
      ['CN-2', 1],
    ]);
  });
  it('las celdas con error (#N/A) se ven, pero no agrupan ni aparecen en la lista de clientes', () => {
    const contenido = crearExcel({
      A1: 'Código',
      B1: 'Descripción',
      C1: 'Cliente',
      D1: 'OC',
      A2: { t: 'e', v: 0x2a, w: '#N/A' },
      B2: 'Desc 1',
      C2: { t: 'e', v: 0x2a, w: '#N/A' },
      D2: 'OC-1',
      A3: { t: 'e', v: 0x2a, w: '#N/A' },
      B3: 'Desc 2',
      C3: { t: 'e', v: 0x07, w: '#DIV/0!' },
      D3: 'OC-2',
      A4: 'CN-1',
      B4: 'Desc 3',
      C4: 'Cliente Demo',
      D4: 'OC-3',
    });
    const r = leerLibro(contenido, OPCIONES);
    expect(r.celdasConError).toBe(4);
    expect(r.filas[0].celdas[0].t).toBe('#N/A');
    expect(agruparPorCentro(r.filas).map((g) => [g.descripcion, g.filas.length])).toEqual([
      ['Desc 1', 1],
      ['Desc 2', 1],
      ['Desc 3', 1],
    ]);
    expect(valoresUnicos(r.filas, 'cliente')).toEqual(['Cliente Demo']);
  });
  it('sin "hoja" en la configuración, lee la primera hoja VISIBLE', () => {
    const contenido = crearLibro([
      { nombre: 'Aux', matriz: [['tmp', 'aux'], [1, 2]], oculta: true },
      { nombre: 'Centros', matriz: [['Código', 'Descripción', 'Cliente', 'OC'], ['CN-1', 'Demo', 'Cliente Demo', 'OC-1']] },
    ]);
    const r = leerLibro(contenido, OPCIONES);
    expect(r.hoja).toBe('Centros');
    expect(r.hojas).toEqual(['Aux', 'Centros']);
    expect(r.faltantes).toEqual([]);
  });
  it('libro con fechas desde 1904', () => {
    const contenido = crearLibro(
      [{ nombre: 'H', matriz: [['Código', 'Fecha'], ['CN-1', { t: 'n', v: 46096 - 1462, z: 'dd/mm/yyyy' }]] }],
      { date1904: true },
    );
    expect(leerLibro(contenido, OPCIONES).filas[0].celdas[1].t).toBe('15/03/2026');
  });
  it('cuenta las fórmulas sin resultado guardado (se verían vacías)', () => {
    const base = crearExcelDesdeMatriz([
      ['Código', 'Descripción', 'Monto'],
      ['CN-1', 'x', 5],
      ['CN-2', 'y', 6],
    ]);
    // Así guarda las fórmulas una librería que no calcula (ej. openpyxl): sin <v> (sin resultado).
    const contenido = cambiarXmlHoja(base, (xml) =>
      xml
        .replace(/<c r="B3"[^>]*>.*?<\/c>/, '<c r="B3" t="str"><f>"Proyecto "&amp;"demo"</f></c>')
        .replace(/<c r="C3"[^>]*>.*?<\/c>/, '<c r="C3"><f>C2*2</f></c>'),
    );
    const r = leerLibro(contenido, OPCIONES);
    expect(r.formulasSinCalcular).toBe(2);
    expect(r.filas[1].celdas[1].t).toBe('');
  });
  it('códigos con forma de fecha se ordenan en orden natural', () => {
    const codigos = ['10-01-0002', '10-01-0010', '20-01-0001', '10-13-0001', '10-01-0001', '05-02-0003'];
    const r = leerLibro(crearExcelDesdeMatriz([['Código', 'OC'], ...codigos.map((c, i) => [c, `OC-${i}`])]), OPCIONES);
    expect(ordenarFilas(r.filas, 0, 'asc').map((f) => f.celdas[0].t)).toEqual([
      '05-02-0003',
      '10-01-0001',
      '10-01-0002',
      '10-01-0010',
      '10-13-0001',
      '20-01-0001',
    ]);
    const ordenes = ['2026-10-00123', '2026-10-00045', '2026-10-00999', '2026-09-00500'];
    const r2 = leerLibro(crearExcelDesdeMatriz([['Código', 'OC'], ...ordenes.map((o) => ['CN-1', o])]), OPCIONES);
    expect(ordenarFilas(r2.filas, 1, 'asc').map((f) => f.celdas[1].t)).toEqual([
      '2026-09-00500',
      '2026-10-00045',
      '2026-10-00123',
      '2026-10-00999',
    ]);
  });
  it('fechas de texto con año de 2 dígitos se ordenan por fecha (en columnas que no son códigos)', () => {
    const fechas = ['01/04/26', '15/03/26', '02/01/27'];
    const r = leerLibro(crearExcelDesdeMatriz([['Código', 'Fecha'], ...fechas.map((f) => ['CN-1', f])]), OPCIONES);
    expect(ordenarFilas(r.filas, 1, 'asc').map((f) => f.celdas[1].t)).toEqual(['15/03/26', '01/04/26', '02/01/27']);
  });
  it('un número largo se puede buscar completo', () => {
    const r = leerLibro(crearExcelDesdeMatriz([['Código', 'OC'], ['CN-1', 450012345678]]), OPCIONES);
    expect(filtrarFilas(r.filas, { q: '450012345678' })).toHaveLength(1);
  });
});

describe('leerLibro — columnas faltantes y casos borde', () => {
  it('informa qué columnas faltan y muestra igual las demás', () => {
    const r = leerLibro(crearExcelDesdeMatriz([['Código', 'Observación'], ['CN-1', 'Algo']]), OPCIONES);
    expect(r.faltantes.map((f) => f.campo)).toEqual(['descripcionCentro', 'cliente', 'ordenCompra']);
    expect(r.columnas.map((c) => c.titulo)).toEqual(['Código', 'Observación']);
    expect(r.filas[0].celdas[1].t).toBe('Algo');
  });
  it('títulos repetidos o vacíos reciben un nombre único', () => {
    const r = leerLibro(
      crearExcelDesdeMatriz([
        ['Código', 'Fecha', 'Fecha', ''],
        ['CN-1', 'a', 'b', 'c'],
      ]),
      OPCIONES,
    );
    expect(r.columnas.map((c) => c.titulo)).toEqual(['Código', 'Fecha', 'Fecha (2)', 'Columna D']);
  });
  it('usa la fila de títulos indicada en la configuración', () => {
    const r = leerLibro(
      crearExcelDesdeMatriz([['x', 'y'], ['Código', 'Cliente'], ['CN-1', 'Demo']]),
      { ...OPCIONES, filaEncabezado: 2 },
    );
    expect(r.filas).toHaveLength(1);
    expect(r.filas[0].campos.cliente).toBe('Demo');
  });
  it('elige la hoja por nombre y avisa si no existe', () => {
    const contenido = crearExcel({ A1: 'Código', B1: 'Cliente', A2: 'CN-1', B2: 'Demo' }, { nombreHoja: 'Resumen', hojasExtra: ['Otra'] });
    expect(leerLibro(contenido, { ...OPCIONES, hoja: 'resumen' }).hoja).toBe('Resumen');
    expect(() => leerLibro(contenido, { ...OPCIONES, hoja: 'No existe' })).toThrow(/No se encontró la hoja/);
  });
  it('hoja vacía no rompe la app', () => {
    const r = leerLibro(crearExcelDesdeMatriz([]), OPCIONES);
    expect(r.filas).toEqual([]);
    expect(r.columnas).toEqual([]);
  });
});

describe('mapearColumnas — estado', () => {
  const alias = CONFIG_POR_DEFECTO.columnas;
  it('reconoce la columna de estado por sus nombres habituales', () => {
    for (const titulo of ['Estado', 'ESTADO DE LA ORDEN', 'Estado O.C.', 'Situación', 'Status', 'Estado del centro']) {
      expect(mapearColumnas(['Código', 'N° Orden', titulo], alias), titulo).toEqual({ codigoCentro: 0, ordenCompra: 1, estado: 2 });
    }
  });
  it('"Estado de la orden de compra" es el estado, no el número de orden', () => {
    expect(mapearColumnas(['Código', 'Estado de la orden de compra', 'Orden de compra'], alias)).toEqual({
      codigoCentro: 0,
      estado: 1,
      ordenCompra: 2,
    });
  });
  it('"Código estado" no se toma como código del centro', () => {
    expect(mapearColumnas(['Código estado', 'Código CN'], alias)).toMatchObject({ codigoCentro: 1 });
  });
});

describe('columnas ocultas (config "columnasOcultas")', () => {
  const OCULTAS = CONFIG_POR_DEFECTO.columnasOcultas; // ["moneda", "monto"]
  const palabras = OCULTAS.map(normalizarEncabezado);

  it('reconoce la palabra completa en el título (sin tildes, mayúsculas ni signos)', () => {
    for (const t of ['Monto', 'MONTO TOTAL', 'Monto (S/)', 'Moneda', 'Tipo de moneda', 'Monto c/IGV']) {
      expect(esTituloOculto(normalizarEncabezado(t), palabras), t).toBe(true);
    }
    for (const t of ['Montos', 'Promontorio', 'Cliente', '']) {
      expect(esTituloOculto(normalizarEncabezado(t), palabras), t).toBe(false);
    }
  });

  const matriz = [
    ['Código', 'Descripción', 'Cliente', 'N° Orden', 'Monto total', 'Moneda', 'Monto (S/)', 'Estado', 'Observación'],
    ['CN-1', 'Demo uno', 'Cliente Demo A', 'OC-1', 1250.5, 'PEN', 'S/ 1,250.50', 'Abierta', 'nota'],
    ['CN-2', 'Demo dos', 'Cliente Demo B', 'OS-2', 300, 'USD', '', 'Cerrada', ''],
    [null, null, null, null, 999, 'USD', null, null, null], // solo datos en columnas ocultas
  ];
  const r = leerLibro(crearExcelDesdeMatriz(matriz), { ...OPCIONES, columnasOcultas: OCULTAS });

  it('no se muestran, no se buscan y no se cuentan', () => {
    expect(r.columnas.map((c) => c.titulo)).toEqual(['Código', 'Descripción', 'Cliente', 'N° Orden', 'Estado', 'Observación']);
    expect(r.columnasOcultas).toEqual([
      { letra: 'E', titulo: 'Monto total' },
      { letra: 'F', titulo: 'Moneda' },
      { letra: 'G', titulo: 'Monto (S/)' },
    ]);
    // Cada fila tiene solo las celdas visibles (así no se exportan ni aparecen en la vista por centro).
    for (const f of r.filas) expect(f.celdas).toHaveLength(6);
    expect(filtrarFilas(r.filas, { q: 'usd' })).toEqual([]);
    expect(filtrarFilas(r.filas, { q: '1250' })).toEqual([]);
    // Una fila que solo tenía monto y moneda no se ve como una fila en blanco.
    expect(r.filas.map((f) => f.id)).toEqual([2, 3]);
    expect(r.filasVacias).toBe(1);
  });

  it('el estado queda como campo (para el filtro desplegable)', () => {
    expect(r.mapa.estado).toBe(4);
    expect(r.filas.map((f) => f.campos.estado)).toEqual(['Abierta', 'Cerrada']);
    expect(valoresUnicos(r.filas, 'estado')).toEqual(['Abierta', 'Cerrada']);
  });

  it('nunca oculta una columna que la app usa como campo, aunque tenga la palabra', () => {
    const otra = leerLibro(
      crearExcelDesdeMatriz([
        ['Código', 'Cliente', 'Orden de compra / monto'],
        ['CN-1', 'Cliente Demo', 'OC-1'],
      ]),
      { ...OPCIONES, columnasOcultas: OCULTAS },
    );
    expect(otra.mapa.ordenCompra).toBe(2);
    expect(otra.columnas.map((c) => c.titulo)).toContain('Orden de compra / monto');
    expect(otra.columnasOcultas).toEqual([]);
  });

  it('para los campos se prefieren las columnas que no se ocultan', () => {
    const otra = leerLibro(
      crearExcelDesdeMatriz([
        ['Código', 'Monto de la orden de compra', 'Orden de compra (N°)'],
        ['CN-1', 500, 'OC-1'],
      ]),
      { ...OPCIONES, columnasOcultas: OCULTAS },
    );
    expect(otra.mapa.ordenCompra).toBe(1); // posición entre las columnas visibles: "Orden de compra (N°)"
    expect(otra.columnas.map((c) => c.titulo)).toEqual(['Código', 'Orden de compra (N°)']);
    expect(otra.filas[0].campos.ordenCompra).toBe('OC-1');
  });

  it('con "columnasOcultas": [] se muestran todas', () => {
    const todas = leerLibro(crearExcelDesdeMatriz(matriz), { ...OPCIONES, columnasOcultas: [] });
    expect(todas.columnas.map((c) => c.titulo)).toContain('Monto total');
    expect(todas.columnasOcultas).toEqual([]);
  });
});

describe('leerLibro — Excel de ejemplo (public/datos/centros-ejemplo.xlsx)', () => {
  const ruta = resolve(import.meta.dirname, '../../public/datos/centros-ejemplo.xlsx');
  const r = leerLibro(new Uint8Array(readFileSync(ruta)), OPCIONES);

  it('se lee completo', () => {
    expect(r.filaEncabezado).toBe(2);
    expect(r.filas).toHaveLength(80);
    expect(r.filasVacias).toBe(2);
    expect(r.faltantes).toEqual([]);
    expect(r.columnas.find((c) => c.campo === 'tipoOrden')).toBeTruthy();
  });
  it('tiene centros con varias órdenes', () => {
    const grupos = agruparPorCentro(r.filas);
    expect(grupos.length).toBeGreaterThan(20);
    expect(grupos.some((g) => g.ordenes >= 3)).toBe(true);
  });
  it('los datos son claramente ficticios', () => {
    for (const f of r.filas) expect(f.campos.cliente).toMatch(/Demo|Ejemplo|Ficticia/);
  });
  it('se puede buscar sin tildes', () => {
    expect(filtrarFilas(r.filas, { q: 'nandu' }).length).toBeGreaterThan(0);
  });
  it('con la configuración por defecto: Monto y Moneda ocultas y la columna Estado lista para filtrar', () => {
    const conDefecto = leerLibro(new Uint8Array(readFileSync(ruta)), {
      ...OPCIONES,
      columnasOcultas: CONFIG_POR_DEFECTO.columnasOcultas,
    });
    const titulos = conDefecto.columnas.map((c) => c.titulo);
    expect(titulos).not.toContain('Monto');
    expect(titulos).not.toContain('Moneda');
    expect(conDefecto.columnasOcultas.map((c) => c.titulo)).toEqual(['Monto', 'Moneda']);
    expect(titulos).toContain('Estado');
    expect(conDefecto.columnas.find((c) => c.titulo === 'Estado')?.campo).toBe('estado');
    expect(conDefecto.filas).toHaveLength(80);
    expect(valoresUnicos(conDefecto.filas, 'estado')).toEqual(['Abierta', 'Cerrada', 'En ejecución', 'Sin orden aún']);
    expect(filtrarFilas(conDefecto.filas, { q: 'usd' })).toEqual([]);
  });
});

describe('descargarExcel (archivo local)', () => {
  it('devuelve el contenido y la fecha de modificación', async () => {
    const fetchFalso = vi.fn(async (_url: string, _opciones?: object) => new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { 'last-modified': 'Fri, 09 Oct 2026 14:10:00 GMT' },
    }));
    const r = await descargarExcel({ datos: { fuente: 'archivo-local', rutaLocal: 'datos/x.xlsx' } }, null, fetchFalso);
    expect(fetchFalso).toHaveBeenCalledWith('datos/x.xlsx', { cache: 'no-store' });
    expect(new Uint8Array(r.contenido)).toEqual(new Uint8Array([1, 2, 3]));
    expect(r.modificado?.toISOString()).toBe('2026-10-09T14:10:00.000Z');
    expect(r.nombre).toBe('x.xlsx');
  });
  it('404 y sin red dan errores claros', async () => {
    const config = { datos: { fuente: 'archivo-local' as const, rutaLocal: 'x.xlsx' } };
    await expect(descargarExcel(config, null, async () => new Response('', { status: 404 }))).rejects.toMatchObject({
      tipo: 'no-encontrado',
    });
    await expect(
      descargarExcel(config, null, async () => {
        throw new TypeError('Failed to fetch');
      }),
    ).rejects.toBeInstanceOf(ErrorDatos);
  });
});
