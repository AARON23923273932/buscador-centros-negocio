import { describe, expect, it } from 'vitest';
import {
  CAMPOS_OPCIONALES,
  FILTROS_VACIOS,
  agruparPorCentro,
  compararValores,
  contarFiltrosActivos,
  dividirTerminos,
  filtrarFilas,
  normalizarTexto,
  ordenarFilas,
  ordenarGrupos,
  paginar,
  prepararFila,
  segmentosResaltado,
  sePuedeFiltrar,
  valoresUnicos,
} from '../../src/logica/filtros.ts';
import type { Filtros } from '../../src/logica/tipos.ts';
import { filaDePrueba } from './ayuda.ts';

const FILAS = [
  filaDePrueba(3, {
    codigoCentro: 'CN-0001',
    descripcionCentro: 'Mantenimiento eléctrico preventivo',
    cliente: 'Cliente Demo A',
    ordenCompra: '0004500100',
    tipoOrden: 'Compra',
    estado: 'Abierta',
  }),
  filaDePrueba(4, {
    codigoCentro: 'CN-0001',
    descripcionCentro: 'Mantenimiento eléctrico preventivo',
    cliente: 'Cliente Demo A',
    ordenCompra: 'OS-2026-0001',
    tipoOrden: 'Servicio',
    estado: 'En ejecución',
  }),
  filaDePrueba(5, {
    codigoCentro: 'CN-0002',
    descripcionCentro: 'Cableado estructurado piso 3',
    cliente: 'Inmobiliaria Demo Ñandú',
    ordenCompra: '0004500101',
    tipoOrden: 'Compra',
    estado: 'ABIERTA',
  }),
  filaDePrueba(6, {
    codigoCentro: 'CN-0003',
    descripcionCentro: 'Instalación de red de datos',
    cliente: 'Cliente Demo B',
    ordenCompra: '',
    tipoOrden: '',
  }),
].map(prepararFila);

describe('normalizarTexto', () => {
  it('quita tildes, mayúsculas y espacios de más', () => {
    expect(normalizarTexto('  Mantenimiento  ELÉCTRICO ')).toBe('mantenimiento electrico');
    expect(normalizarTexto('Ñandú')).toBe('nandu');
    expect(normalizarTexto(null)).toBe('');
    expect(normalizarTexto(123)).toBe('123');
  });
});

describe('dividirTerminos', () => {
  it('separa en palabras sin repetir', () => {
    expect(dividirTerminos('  CN   01 cn ')).toEqual(['cn', '01']);
    expect(dividirTerminos('')).toEqual([]);
  });
});

describe('filtrarFilas — buscador global', () => {
  const ids = (filtros: Partial<Filtros>) => filtrarFilas(FILAS, filtros).map((f) => f.id);

  it('sin búsqueda devuelve todo', () => {
    expect(ids({})).toEqual([3, 4, 5, 6]);
  });
  it('no distingue mayúsculas ni tildes', () => {
    expect(ids({ q: 'ELECTRICO' })).toEqual([3, 4]);
    expect(ids({ q: 'nandu' })).toEqual([5]);
    expect(ids({ q: 'instalacion' })).toEqual([6]);
  });
  it('varias palabras: todas deben aparecer (en cualquier columna)', () => {
    expect(ids({ q: 'demo a servicio' })).toEqual([4]);
    expect(ids({ q: 'cableado ñandú 4500101' })).toEqual([5]);
    expect(ids({ q: 'cableado servicio' })).toEqual([]);
  });
  it('encuentra códigos aunque se escriban sin guion', () => {
    expect(ids({ q: 'cn0002' })).toEqual([5]);
    expect(ids({ q: 'os20260001' })).toEqual([4]);
  });
  it('encuentra parte del número de orden (con ceros a la izquierda)', () => {
    expect(ids({ q: '4500100' })).toEqual([3]);
    expect(ids({ q: '00045001' })).toEqual([3, 5]);
  });
  it('una palabra no "cruza" de una celda a otra', () => {
    expect(ids({ q: 'preventivocliente' })).toEqual([]);
  });
});

describe('filtrarFilas — filtros por campo', () => {
  const ids = (filtros: Partial<Filtros>) => filtrarFilas(FILAS, filtros).map((f) => f.id);

  it('cliente: coincidencia exacta (sin importar tildes)', () => {
    expect(ids({ cliente: 'Cliente Demo A' })).toEqual([3, 4]);
    expect(ids({ cliente: 'inmobiliaria demo nandu' })).toEqual([5]);
    expect(ids({ cliente: 'Cliente Demo' })).toEqual([]);
  });
  it('código, descripción y orden: "contiene"', () => {
    expect(ids({ codigo: '0001' })).toEqual([3, 4]);
    expect(ids({ descripcion: 'piso' })).toEqual([5]);
    expect(ids({ orden: 'os-' })).toEqual([4]);
  });
  it('tipo de orden', () => {
    expect(ids({ tipo: 'servicio' })).toEqual([4]);
  });
  it('estado: coincidencia exacta con una de las opciones (sin importar tildes ni mayúsculas)', () => {
    expect(ids({ estado: 'Abierta' })).toEqual([3, 5]);
    expect(ids({ estado: 'en ejecucion' })).toEqual([4]);
    expect(ids({ estado: 'Abier' })).toEqual([]);
    expect(ids({ estado: 'Abierta', tipo: 'Compra', cliente: 'Cliente Demo A' })).toEqual([3]);
  });
  it('se combinan con el buscador', () => {
    expect(ids({ q: 'demo', codigo: 'CN-0001', tipo: 'Compra' })).toEqual([3]);
  });
  it('cuenta filtros activos', () => {
    expect(contarFiltrosActivos({ q: 'x', cliente: 'a', codigo: ' ', orden: '1' })).toBe(2);
    expect(contarFiltrosActivos({ ...FILTROS_VACIOS, tipo: 'Compra', descripcion: 'x' })).toBe(2);
    expect(contarFiltrosActivos({ ...FILTROS_VACIOS, estado: 'Abierta' })).toBe(1);
    expect(FILTROS_VACIOS).toHaveProperty('estado', '');
    expect(contarFiltrosActivos(FILTROS_VACIOS)).toBe(0);
  });
});

describe('compararValores y ordenarFilas', () => {
  it('números antes que textos y vacíos al final', () => {
    expect([10, 'b', '', 2, 'a', null].sort(compararValores)).toEqual([2, 10, 'a', 'b', '', null]);
  });
  it('textos con números en orden "humano"', () => {
    expect(['CN-10', 'CN-2', 'cn-1'].sort(compararValores)).toEqual(['cn-1', 'CN-2', 'CN-10']);
  });
  it('ordena asc/desc dejando vacíos al final y sin modificar el original', () => {
    const asc = ordenarFilas(FILAS, 3, 'asc').map((f) => f.id);
    const desc = ordenarFilas(FILAS, 3, 'desc').map((f) => f.id);
    expect(asc[asc.length - 1]).toBe(6);
    expect(desc[desc.length - 1]).toBe(6);
    expect(asc.slice(0, 3)).toEqual([3, 5, 4]);
    expect(desc.slice(0, 3)).toEqual([4, 5, 3]);
    expect(FILAS.map((f) => f.id)).toEqual([3, 4, 5, 6]);
  });
  it('empates conservan el orden del Excel', () => {
    expect(ordenarFilas(FILAS, 2, 'asc').map((f) => f.id)).toEqual([3, 4, 6, 5]);
  });
});

describe('agruparPorCentro', () => {
  it('una fila por centro, con clientes y órdenes distintas', () => {
    const grupos = agruparPorCentro(FILAS);
    expect(grupos.map((g) => g.codigo)).toEqual(['CN-0001', 'CN-0002', 'CN-0003']);
    expect(grupos[0].ordenes).toBe(2);
    expect(grupos[0].filas).toHaveLength(2);
    expect(grupos[0].clientes).toEqual(['Cliente Demo A']);
    expect(grupos[2].ordenes).toBe(0);
  });
  it('ordena grupos por número de órdenes', () => {
    const grupos = ordenarGrupos(agruparPorCentro(FILAS), 'ordenes', 'desc');
    expect(grupos[0].codigo).toBe('CN-0001');
    expect(ordenarGrupos(agruparPorCentro(FILAS), 'ordenes', 'asc')[0].codigo).toBe('CN-0003');
  });
  it('agrupa por descripción si no hay código', () => {
    const filas = [
      filaDePrueba(1, { descripcionCentro: 'Proyecto X', ordenCompra: '1' }),
      filaDePrueba(2, { descripcionCentro: 'proyecto x', ordenCompra: '2' }),
    ].map(prepararFila);
    const grupos = agruparPorCentro(filas);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].ordenes).toBe(2);
  });
});

describe('paginar', () => {
  const lista = Array.from({ length: 53 }, (_, i) => i + 1);
  it('calcula desde/hasta y total de páginas', () => {
    const p = paginar(lista, 2, 25);
    expect(p).toMatchObject({ pagina: 2, totalPaginas: 3, total: 53, desde: 26, hasta: 50 });
    expect(p.items[0]).toBe(26);
  });
  it('corrige páginas fuera de rango', () => {
    expect(paginar(lista, 99, 25).pagina).toBe(3);
    expect(paginar(lista, -1, 25).pagina).toBe(1);
    expect(paginar(lista, 3, 25).hasta).toBe(53);
  });
  it('lista vacía', () => {
    expect(paginar([], 1, 25)).toMatchObject({ pagina: 1, totalPaginas: 1, total: 0, desde: 0, hasta: 0 });
  });
});

describe('valoresUnicos', () => {
  it('sin repetidos y en orden alfabético', () => {
    expect(valoresUnicos(FILAS, 'cliente')).toEqual(['Cliente Demo A', 'Cliente Demo B', 'Inmobiliaria Demo Ñandú']);
    expect(valoresUnicos(FILAS, 'estado')).toEqual(['Abierta', 'En ejecución']);
  });
  it('un valor escrito de varias formas muestra la más repetida (o la que empieza con mayúscula)', () => {
    const conEstados = (...estados: string[]) => estados.map((estado, i) => prepararFila(filaDePrueba(i + 2, { estado })));
    expect(valoresUnicos(conEstados('abierta', 'Abierta', 'ANULADA'), 'estado')).toEqual(['Abierta', 'ANULADA']);
    expect(valoresUnicos(conEstados('Cerrada', 'cerrada', 'cerrada'), 'estado')).toEqual(['cerrada']);
    expect(valoresUnicos(conEstados('CERRADA', 'Cerrada'), 'estado')).toEqual(['CERRADA']);
  });
});

describe('sePuedeFiltrar', () => {
  const mapa = { codigoCentro: 0, cliente: 2, tipoOrden: 4, estado: 5 };
  const vacias = [prepararFila(filaDePrueba(2, { codigoCentro: 'CN-1', cliente: '' }))];
  it('hace falta que el Excel tenga la columna', () => {
    expect(sePuedeFiltrar('ordenCompra', mapa, FILAS)).toBe(false);
    expect(sePuedeFiltrar('estado', mapa, FILAS)).toBe(true);
    expect(sePuedeFiltrar('estado', null, FILAS)).toBe(false);
  });
  it('Tipo de orden y Estado (opcionales) con la columna vacía: no sirven para filtrar', () => {
    expect(CAMPOS_OPCIONALES).toEqual(['tipoOrden', 'estado']);
    expect(sePuedeFiltrar('estado', mapa, vacias)).toBe(false);
    expect(sePuedeFiltrar('tipoOrden', mapa, vacias)).toBe(false);
    expect(sePuedeFiltrar('cliente', mapa, vacias)).toBe(true);
  });
});

describe('segmentosResaltado (lo que se marca en amarillo)', () => {
  it('parte el texto en trozos marcados y sin marcar, conservando el texto original', () => {
    expect(segmentosResaltado('Mantenimiento Eléctrico', ['electrico'])).toEqual([
      { texto: 'Mantenimiento ', marcado: false },
      { texto: 'Eléctrico', marcado: true },
    ]);
  });
  it('sin términos: un solo trozo sin marcar; texto vacío: ningún trozo', () => {
    expect(segmentosResaltado('a & b', [])).toEqual([{ texto: 'a & b', marcado: false }]);
    expect(segmentosResaltado('', ['x'])).toEqual([]);
    expect(segmentosResaltado(null, ['x'])).toEqual([]);
    expect(segmentosResaltado(12345, ['234'])).toEqual([
      { texto: '1', marcado: false },
      { texto: '234', marcado: true },
      { texto: '5', marcado: false },
    ]);
  });
  it('los caracteres de dos posiciones (emojis) no se cortan por la mitad', () => {
    const segmentos = segmentosResaltado('🔧 Taller ñandú', ['nandu']);
    expect(segmentos.map((x) => x.texto).join('')).toBe('🔧 Taller ñandú');
    expect(segmentos.filter((x) => x.marcado).map((x) => x.texto)).toEqual(['ñandú']);
  });
});
