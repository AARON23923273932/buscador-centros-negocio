const dos = (n: number): string => String(n).padStart(2, '0');

export const hora = (d: Date): string => `${dos(d.getHours())}:${dos(d.getMinutes())}`;

export const fecha = (d: Date): string => `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;

export const numero = (n: unknown): string => Number(n).toLocaleString('es-PE');

export function iniciales(texto: unknown): string {
  const partes = String(texto)
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean);
  return (partes[0]?.[0] || '?').toUpperCase() + (partes[1]?.[0] || '').toUpperCase();
}
