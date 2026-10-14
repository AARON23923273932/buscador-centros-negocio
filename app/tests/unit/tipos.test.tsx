// Pruebas de TIPOS: cada "@ts-expect-error" dice que TypeScript DEBE rechazar la línea de abajo.
// Si alguien afloja un tipo (ej. vuelve a aceptar cualquier texto como dirección de orden), la línea
// deja de dar error y "npm run typecheck" falla ("Unused '@ts-expect-error' directive").
// Vitest también las ejecuta: muestran que, aunque llegara un valor raro, la app no se rompe.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Resaltado } from '../../src/componentes/Resaltado.tsx';
import { CONFIG_POR_DEFECTO, mezclarConfig, revisarConfig, type Config } from '../../src/logica/config.ts';
import { en } from '../../src/logica/listas.ts';
import { ordenarGrupos, paginar } from '../../src/logica/filtros.ts';
import { estadoOrden } from '../../src/logica/tabla.ts';
import { textoActualizado } from '../../src/logica/vista.ts';

describe('tipos estrictos (los revisa npm run typecheck)', () => {
  it('la dirección de orden solo puede ser "asc" o "desc"', () => {
    // @ts-expect-error: "arriba" no es una dirección
    expect(estadoOrden('codigo', 'codigo', 'arriba').aria).toBe('ascending');
    // @ts-expect-error: tampoco en el orden de los centros
    expect(ordenarGrupos([], 'codigo', 'DESC')).toEqual([]);
  });

  it('página, filas por página y minutos son números (no textos)', () => {
    // @ts-expect-error: la página llega como número (la URL ya se convierte en estado-url.ts)
    expect(paginar([1, 2, 3], '2', 2).pagina).toBe(2);
    // @ts-expect-error: los minutos de config.json ya están revisados (número)
    expect(textoActualizado(null, null, '10')).toBe('se actualiza solo cada 10 min');
  });

  it('el resaltado recibe texto', () => {
    // @ts-expect-error: null no es un texto
    expect(renderToStaticMarkup(<Resaltado texto={null} terminos={['x']} />)).toBe('');
  });

  it('config.json sin revisar no se puede usar como Config: hay que pasar por revisarConfig()', () => {
    const sinRevisar = mezclarConfig(CONFIG_POR_DEFECTO, { filasPorPagina: 25 });
    // @ts-expect-error: todavía no se revisó
    const directo: Config = sinRevisar;
    expect(directo.filasPorPagina).toBe(25);
    const revision = revisarConfig(sinRevisar);
    const revisada: Config | null = revision.valida ? revision.config : null;
    expect(revisada?.filasPorPagina).toBe(25);
  });
});

describe('en(lista, i): una posición que se sabe que existe', () => {
  it('devuelve el elemento (también si el elemento es undefined)', () => {
    expect(en(['a', 'b'], 1)).toBe('b');
    expect(en([undefined, 1], 0)).toBeUndefined();
  });
  it('si la posición no existe, falla con un mensaje claro (en vez de seguir con un valor vacío)', () => {
    expect(() => en(['a'], 1)).toThrow(new RangeError('La posición 1 no existe (la lista tiene 1 elementos).'));
    expect(() => en(['a'], -1)).toThrow(RangeError);
    expect(() => en(['a'], 0.5)).toThrow(RangeError);
  });
});
