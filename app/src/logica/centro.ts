// =============================================================================
// centro.ts — Detalle de un centro de negocio (ruta /centros/:codigo): encontrar el centro por su
// código y resumir sus datos (funciones puras: se prueban sin navegador).
// =============================================================================

import { agruparPorCentro, normalizarTexto, valoresUnicos } from './filtros.ts';
import type { Fila, Grupo } from './tipos.ts';

/**
 * El centro con ese código y TODAS sus filas del Excel (null si no hay ninguno).
 * El código se compara igual que al agrupar "Por centro": sin importar mayúsculas, tildes ni espacios
 * de más (así un enlace con "a2338py01" encuentra "A2338PY01").
 */
export function buscarCentro(filas: readonly Fila[], codigo: string): Grupo | null {
  const buscado = normalizarTexto(codigo);
  if (!buscado) return null;
  const suyas = filas.filter((f) => f._norm.codigoCentro === buscado);
  return agruparPorCentro(suyas)[0] ?? null;
}

/** ¿Es el mismo código de centro? Se comparan igual que en buscarCentro (sin importar mayúsculas, tildes ni espacios). */
export function mismoCodigo(a: string, b: string): boolean {
  return normalizarTexto(a) === normalizarTexto(b);
}

/** Estados distintos de las órdenes del centro (ej. ["Abierta", "Cerrada"]), sin repetir ni vacíos. */
export function estadosDeCentro(grupo: Pick<Grupo, 'filas'>): string[] {
  return valoresUnicos(grupo.filas, 'estado');
}
