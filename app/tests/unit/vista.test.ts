// Qué se ve en la pantalla principal (logica/vista.ts): filtros disponibles, corrección del estado
// según las columnas del Excel y el cálculo de la tabla (sin navegador).
import { assert, describe, expect, it } from 'vitest';
import { CONFIG_POR_DEFECTO } from '../../src/logica/config.ts';
import { leerLibro } from '../../src/logica/datos.ts';
import { estadoInicial } from '../../src/logica/estado-url.ts';
import type { EstadoBusqueda } from '../../src/logica/tipos.ts';
import {
  ajustarEstadoAColumnas,
  calcularResultados,
  calcularVista,
  estadoControles,
  opcionesDesplegables,
  paginarResultados,
  terminosDeColumna,
  textoActualizado,
  vistaCentroDisponible,
} from '../../src/logica/vista.ts';
import { crearExcelDesdeMatriz } from './ayuda.ts';

const OPCIONES = {
  columnas: CONFIG_POR_DEFECTO.columnas,
  camposObligatorios: CONFIG_POR_DEFECTO.camposObligatorios,
  rellenarHaciaAbajo: CONFIG_POR_DEFECTO.datos.rellenarHaciaAbajo,
  columnasOcultas: CONFIG_POR_DEFECTO.columnasOcultas,
};
const leer = (matriz: unknown[][]) => leerLibro(crearExcelDesdeMatriz(matriz), OPCIONES);

const COMPLETO = leer([
  ['Código', 'Descripción', 'Cliente', 'Orden de compra', 'Tipo de orden', 'Estado'],
  ['CN-0002', 'Cableado piso 2', 'Cliente Demo B', 'OC-3', 'Compra', 'abierta'],
  ['CN-0001', 'Fibra óptica', 'Cliente Demo A', 'OC-1', 'Compra', 'Abierta'],
  ['CN-0001', 'Fibra óptica', 'Cliente Demo A', 'OS-2', 'Servicio', 'Abierta'],
  ['CN-0003', 'Cámaras', 'Cliente Demo A', 'OC-4', 'Compra', 'Cerrada'],
]);
const SIN_TIPO_NI_CENTRO = leer([
  ['Cliente', 'Orden de compra', 'Tipo de orden'],
  ['Cliente Demo A', 'OC-1', ''],
]);

const estado = (cambios: Partial<EstadoBusqueda> = {}): EstadoBusqueda => ({ ...estadoInicial(50), ...cambios });

describe('estadoControles y opciones de los desplegables', () => {
  it('antes de leer el Excel todos los filtros están disponibles y sin opciones', () => {
    expect(Object.values(estadoControles(null)).every((c) => c.disponible && c.motivo === '')).toBe(true);
    expect(opcionesDesplegables(null)).toEqual({ cliente: [], tipo: [], estado: [] });
    expect(vistaCentroDisponible(null)).toBe(true);
  });
  it('explica por qué un filtro está desactivado (columna que falta o vacía)', () => {
    const c = estadoControles(SIN_TIPO_NI_CENTRO);
    expect(c.cliente).toEqual({ disponible: true, motivo: '' });
    expect(c.codigo).toEqual({ disponible: false, motivo: 'No se encontró esta columna en el Excel' });
    expect(c.tipo).toEqual({ disponible: false, motivo: 'Esta columna del Excel está vacía' });
    expect(vistaCentroDisponible(SIN_TIPO_NI_CENTRO)).toBe(false);
  });
  it('las opciones son los valores del Excel, sin repetir y en orden alfabético', () => {
    expect(opcionesDesplegables(COMPLETO)).toEqual({
      cliente: ['Cliente Demo A', 'Cliente Demo B'],
      tipo: ['Compra', 'Servicio'],
      estado: ['Abierta', 'Cerrada'],
    });
  });
});

describe('ajustarEstadoAColumnas (al leer el Excel)', () => {
  it('vacía los filtros de columnas que no existen o están vacías', () => {
    const e = ajustarEstadoAColumnas(estado({ codigo: 'CN', tipo: 'Compra', cliente: 'Cliente Demo A', q: 'oc' }), SIN_TIPO_NI_CENTRO);
    expect(e).toMatchObject({ codigo: '', tipo: '', cliente: 'Cliente Demo A', q: 'oc' });
  });
  it('en los desplegables usa la forma escrita en el Excel', () => {
    expect(ajustarEstadoAColumnas(estado({ estado: 'ABIERTA', cliente: 'cliente demo b' }), COMPLETO)).toMatchObject({
      estado: 'Abierta',
      cliente: 'Cliente Demo B',
    });
    // Un valor que no existe en el Excel se deja tal cual (la tabla queda vacía, como con el enlace original).
    expect(ajustarEstadoAColumnas(estado({ estado: 'Anulada' }), COMPLETO).estado).toBe('Anulada');
  });
  it('sin columnas de centro, la vista "Por centro" vuelve a "Por orden"', () => {
    expect(ajustarEstadoAColumnas(estado({ vista: 'centro' }), SIN_TIPO_NI_CENTRO).vista).toBe('orden');
    expect(ajustarEstadoAColumnas(estado({ vista: 'centro' }), COMPLETO).vista).toBe('centro');
  });
  it('no modifica el estado que recibe', () => {
    const original = estado({ codigo: 'CN' });
    ajustarEstadoAColumnas(original, SIN_TIPO_NI_CENTRO);
    expect(original.codigo).toBe('CN');
  });
});

describe('calcularVista', () => {
  it('"Por orden": filtra, ordena por la columna elegida y pagina', () => {
    const v = calcularVista(COMPLETO, estado({ cliente: 'Cliente Demo A', ordenarPor: 'ordenCompra', direccion: 'desc', tamano: 2 }), 3);
    assert(v.tipo === 'orden');
    expect(v.filas.map((f) => f.campos.ordenCompra)).toEqual(['OS-2', 'OC-4', 'OC-1']);
    expect(v.pagina.items.map((f) => f.campos.ordenCompra)).toEqual(['OS-2', 'OC-4']);
    expect(v.contador).toBe('Mostrando 1–2 de 3 resultados (de 4 en total)');
    expect(v.grupos).toBeNull();
  });
  it('"Por centro": agrupa, exporta todas las filas de los centros y cuenta sobre el total de centros', () => {
    const v = calcularVista(COMPLETO, estado({ vista: 'centro', ordenarPor: 'ordenes', direccion: 'desc' }), 3);
    assert(v.tipo === 'centro');
    expect(v.grupos.map((g) => [g.codigo, g.ordenes])).toEqual([
      ['CN-0001', 2],
      ['CN-0002', 1],
      ['CN-0003', 1],
    ]);
    expect(v.filas).toHaveLength(4);
    expect(v.contador).toBe('Mostrando 1–3 de 3 centros (de 3 en total)');
  });
  it('los resultados (filtrados y ordenados) se calculan una vez y sirven para todas las páginas', () => {
    const resultados = calcularResultados(COMPLETO, estado({ ordenarPor: 'ordenCompra' }), 3);
    const pagina2 = paginarResultados(resultados, 2, 2);
    expect(pagina2.filas).toBe(resultados.filas); // misma lista: no se volvió a filtrar ni a ordenar
    expect(pagina2).toEqual(calcularVista(COMPLETO, estado({ ordenarPor: 'ordenCompra', pagina: 2, tamano: 2 }), 3));
    expect(pagina2.pagina.items.map((f) => f.campos.ordenCompra)).toEqual(['OC-4', 'OS-2']);
    expect(pagina2.contador).toBe('Mostrando 3–4 de 4 resultados (de 4 en total)');
  });
  it('una página que ya no existe se corrige a la última', () => {
    expect(calcularVista(COMPLETO, estado({ pagina: 9, tamano: 25 }), 3).pagina.pagina).toBe(1);
  });
  it('lo escrito en los filtros "contiene" también se resalta en su columna', () => {
    const v = calcularVista(COMPLETO, estado({ q: 'fibra', descripcion: 'Óptica' }), 3);
    expect(v.terminos).toEqual(['fibra']);
    expect(terminosDeColumna(v.terminos, v.porCampo, { campo: 'descripcionCentro' })).toEqual(['fibra', 'optica']);
    expect(terminosDeColumna(v.terminos, v.porCampo, { campo: 'cliente' })).toEqual(['fibra']);
    expect(terminosDeColumna(v.terminos, v.porCampo, { campo: null })).toEqual(['fibra']);
  });
});

describe('textoActualizado', () => {
  it('hora de la consulta, fecha del Excel y cada cuánto se actualiza', () => {
    const consulta = new Date(2026, 9, 13, 9, 5);
    const modificado = new Date(2026, 9, 8, 16, 45);
    expect(textoActualizado(consulta, modificado, 10)).toBe(
      'Datos actualizados a las 09:05 · Excel modificado el 08/10/2026 a las 16:45 · se actualiza solo cada 10 min',
    );
    expect(textoActualizado(consulta, null, 0)).toBe('Datos actualizados a las 09:05');
  });
});
