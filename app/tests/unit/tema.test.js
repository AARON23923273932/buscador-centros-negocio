import { describe, expect, it } from 'vitest';
import { temaContrario, temaEfectivo } from '../../src/tema.js';

describe('tema claro/oscuro', () => {
  it('sin elección guardada sigue al sistema', () => {
    expect(temaEfectivo(null, true)).toBe('oscuro');
    expect(temaEfectivo(null, false)).toBe('claro');
    expect(temaEfectivo('cualquier-cosa', true)).toBe('oscuro');
  });

  it('la elección guardada gana al sistema', () => {
    expect(temaEfectivo('claro', true)).toBe('claro');
    expect(temaEfectivo('oscuro', false)).toBe('oscuro');
  });

  it('el botón lleva al modo contrario', () => {
    expect(temaContrario('claro')).toBe('oscuro');
    expect(temaContrario('oscuro')).toBe('claro');
  });
});
