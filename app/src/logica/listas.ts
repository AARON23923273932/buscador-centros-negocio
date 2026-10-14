// =============================================================================
// listas.ts — Leer una posición de una lista cuando el código ya sabe que existe.
//
// Con "noUncheckedIndexedAccess" (tsconfig.json), lista[i] tiene el tipo "T | undefined": TypeScript
// obliga a revisar que la posición exista. Casi siempre se resuelve con for…of, destructuring o "??".
// en() es para el caso que queda: listas armadas en paralelo (del mismo largo) o posiciones que salen de
// otra lista. Lo dice explícitamente y, si algún día no fuera así, falla con un mensaje claro en vez de
// seguir con un valor vacío.
// =============================================================================

/** lista[i], sabiendo que esa posición existe (si no existe, lanza un error claro). */
export function en<T>(lista: readonly T[], i: number): T {
  if (!Number.isInteger(i) || i < 0 || i >= lista.length) {
    throw new RangeError(`La posición ${i} no existe (la lista tiene ${lista.length} elementos).`);
  }
  // Ya se comprobó que i está dentro de la lista: el valor es un T (aunque T incluya undefined).
  return lista[i] as T;
}
