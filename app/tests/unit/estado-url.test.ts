import { describe, expect, it } from 'vitest';
import { escribirEstadoEnUrl, estadoInicial, leerEstadoDeUrl } from '../../src/logica/estado-url.ts';
import { FILTROS_VACIOS } from '../../src/logica/filtros.ts';
import type { EstadoBusqueda } from '../../src/logica/tipos.ts';

describe('estado en la URL', () => {
  it('estado normal = URL limpia', () => {
    expect(escribirEstadoEnUrl(estadoInicial(50), 50)).toBe('');
  });
  it('el estado inicial usa la misma lista de filtros que "Limpiar filtros" (FILTROS_VACIOS)', () => {
    expect(estadoInicial(50)).toMatchObject(FILTROS_VACIOS);
  });
  // La vista ya no va en la query (es la ruta /ordenes o /centros): la ida y vuelta es con la vista normal.
  it('ida y vuelta conserva búsqueda, filtros, orden y página', () => {
    const estado: EstadoBusqueda = {
      ...estadoInicial(50),
      q: 'cableado ñandú',
      cliente: 'Cliente Demo A S.A.C.',
      codigo: 'CN-00',
      descripcion: 'eléctrico',
      orden: '4500',
      tipo: 'Compra',
      estado: 'En ejecución',
      ordenarPor: 'cliente',
      direccion: 'desc',
      pagina: 3,
      tamano: 100,
    };
    const url = escribirEstadoEnUrl(estado, 50);
    expect(url.startsWith('?')).toBe(true);
    expect(url).not.toMatch(/[?&](code|state|error)=/); // nombres reservados por el login
    expect(url).toContain('estado=En+ejecuci%C3%B3n');
    expect(leerEstadoDeUrl(url, 50)).toEqual(estado);
  });
  it('la vista no se escribe en la query (va en la ruta); ?vista=centro de un enlace viejo se sigue leyendo', () => {
    expect(escribirEstadoEnUrl({ ...estadoInicial(50), vista: 'centro', q: 'fibra' }, 50)).toBe('?q=fibra');
    expect(leerEstadoDeUrl('?q=fibra&vista=centro', 50)).toMatchObject({ q: 'fibra', vista: 'centro' });
  });
  it('valores raros se ignoran', () => {
    const e = leerEstadoDeUrl('?vista=otra&pag=-4&tam=7&dir=x', 50);
    expect(e.vista).toBe('orden');
    expect(e.pagina).toBe(1);
    expect(e.tamano).toBe(50);
    expect(e.direccion).toBe('asc');
  });
  it('limita textos muy largos', () => {
    expect(leerEstadoDeUrl(`?q=${'a'.repeat(500)}`, 50).q).toHaveLength(200);
  });
});
