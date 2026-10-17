export function en<T>(lista: readonly T[], i: number): T {
  if (!Number.isInteger(i) || i < 0 || i >= lista.length) {
    throw new RangeError(`La posición ${i} no existe (la lista tiene ${lista.length} elementos).`);
  }
  return lista[i] as T;
}
