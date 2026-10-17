import { agruparPorCentro, normalizarTexto, valoresUnicos } from './filtros.ts';
import type { Fila, Grupo } from './tipos.ts';

export function buscarCentro(filas: readonly Fila[], codigo: string): Grupo | null {
  const buscado = normalizarTexto(codigo);
  if (!buscado) return null;
  const suyas = filas.filter((f) => f._norm.codigoCentro === buscado);
  return agruparPorCentro(suyas)[0] ?? null;
}

export function mismoCodigo(a: string, b: string): boolean {
  return normalizarTexto(a) === normalizarTexto(b);
}

export function estadosDeCentro(grupo: Pick<Grupo, 'filas'>): string[] {
  return valoresUnicos(grupo.filas, 'estado');
}
