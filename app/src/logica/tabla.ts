// =============================================================================
// tabla.ts — Reglas (puras) de la tabla: indicador de orden, clases de las columnas
// y el texto del contador. Los componentes que la dibujan están en componentes/.
// =============================================================================

import { numero } from './formato.ts';
import type { Columna, Direccion, Pagina, Vista } from './tipos.ts';

/**
 * Estado de orden de un encabezado: valor de aria-sort (lo leen los lectores de pantalla y elige el
 * indicador ▲ ▼ que dibuja componentes/Iconos.tsx) y si es la columna ordenada.
 */
export interface EstadoOrden {
  aria: 'none' | 'ascending' | 'descending';
  activo: boolean;
}

export function estadoOrden(clave: string, ordenarPor: string, direccion: Direccion): EstadoOrden {
  if (clave !== ordenarPor) return { aria: 'none', activo: false };
  return direccion === 'desc' ? { aria: 'descending', activo: true } : { aria: 'ascending', activo: true };
}

/** Clases (Tailwind) de las columnas de números: alineadas a la derecha, con cifras del mismo ancho. */
export const CLASE_NUMERO = 'text-right tabular-nums';
/** Clases (Tailwind) de la descripción: puede ocupar varias líneas (las demás columnas, no). */
export const CLASE_ANCHA = 'min-w-[260px] max-w-[480px] whitespace-normal max-escritorio:min-w-[200px]';

/** Clases de las celdas de una columna según su tipo: números a la derecha; la descripción, ancha. */
export function claseColumna(columna: Pick<Columna, 'tipo' | 'campo'>): string {
  const clases: string[] = [];
  if (columna.tipo === 'numero') clases.push(CLASE_NUMERO);
  if (columna.campo === 'descripcionCentro') clases.push(CLASE_ANCHA);
  return clases.join(' ');
}

/** "Mostrando 1–50 de 63 resultados (de 80 en total)" */
export function textoContador(pag: Pick<Pagina<unknown>, 'total' | 'desde' | 'hasta'>, totalGeneral: number, vista: Vista): string {
  const unidad = vista === 'centro' ? ['centro', 'centros'] : ['resultado', 'resultados'];
  const nombre = pag.total === 1 ? unidad[0] : unidad[1];
  if (pag.total === 0) return `Sin ${unidad[1]} (de ${numero(totalGeneral)} en total)`;
  return `Mostrando ${numero(pag.desde)}–${numero(pag.hasta)} de ${numero(pag.total)} ${nombre} (de ${numero(totalGeneral)} en total)`;
}
