// =============================================================================
// tabla.ts — Reglas (puras) de la tabla: indicador de orden, clases de las columnas
// y el texto del contador. Los componentes que la dibujan están en componentes/.
// =============================================================================

import { numero } from './formato.ts';
import type { Columna, Pagina, Vista } from './tipos.ts';

/** Indicador de orden (▲ ▼) y valor de aria-sort para un encabezado. */
export interface EstadoOrden {
  aria: 'none' | 'ascending' | 'descending';
  icono: string;
  activo: boolean;
}

export function estadoOrden(clave: string, ordenarPor: string, direccion: string): EstadoOrden {
  if (clave !== ordenarPor) return { aria: 'none', icono: '↕', activo: false };
  return direccion === 'desc'
    ? { aria: 'descending', icono: '▼', activo: true }
    : { aria: 'ascending', icono: '▲', activo: true };
}

/** Clases CSS de una columna: "num" (alineada a la derecha), "campo-…" y "ancha" (descripción). */
export function claseColumna(columna: Pick<Columna, 'tipo' | 'campo'>): string {
  const clases: string[] = [];
  if (columna.tipo === 'numero') clases.push('num');
  if (columna.campo) clases.push(`campo-${columna.campo}`);
  if (columna.campo === 'descripcionCentro') clases.push('ancha');
  return clases.join(' ');
}

/** "Mostrando 1–50 de 63 resultados (de 80 en total)" */
export function textoContador(pag: Pick<Pagina<unknown>, 'total' | 'desde' | 'hasta'>, totalGeneral: number, vista: Vista): string {
  const unidad = vista === 'centro' ? ['centro', 'centros'] : ['resultado', 'resultados'];
  const nombre = pag.total === 1 ? unidad[0] : unidad[1];
  if (pag.total === 0) return `Sin ${unidad[1]} (de ${numero(totalGeneral)} en total)`;
  return `Mostrando ${numero(pag.desde)}–${numero(pag.hasta)} de ${numero(pag.total)} ${nombre} (de ${numero(totalGeneral)} en total)`;
}
