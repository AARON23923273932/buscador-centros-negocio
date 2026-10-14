// =============================================================================
// formato.ts — Cómo se escriben en pantalla las horas, fechas, números e iniciales.
// =============================================================================

const dos = (n: number): string => String(n).padStart(2, '0');

/** "14:05" */
export const hora = (d: Date): string => `${dos(d.getHours())}:${dos(d.getMinutes())}`;

/** "09/10/2026" */
export const fecha = (d: Date): string => `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;

/** 1250 -> "1,250" (como se escriben los números en Perú). */
export const numero = (n: unknown): string => Number(n).toLocaleString('es-PE');

/** Iniciales para el círculo del usuario: "Ana Pérez" -> "AP", "luis.rojas@aic.pe" -> "LR". */
export function iniciales(texto: unknown): string {
  const partes = String(texto)
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean);
  return (partes[0]?.[0] || '?').toUpperCase() + (partes[1]?.[0] || '').toUpperCase();
}
