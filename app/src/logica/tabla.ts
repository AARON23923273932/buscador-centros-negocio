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

/**
 * Encabezado de tabla "de marca" (guía de AIC: fondo Primary Blue, texto blanco en negrita y centrado). Es lo único
 * de color que se agrega a la Table de shadcn/ui (además de las filas alternas): usa las variables del tema
 * (bg-primary / text-primary-foreground), así que en modo oscuro toma los colores oscuros del tema.
 */
export const CLASE_ENCABEZADO = 'bg-primary text-center font-bold text-primary-foreground';
/** Encabezado fijo arriba al bajar dentro de la caja con scroll de la tabla (solo ubicación). */
export const CLASE_ENCABEZADO_FIJO = 'sticky top-0 z-10';
/** Filas alternas (guía de AIC: Light Gray en las tablas de datos; en oscuro, el --muted del tema). */
export const CLASE_FILA_ALTERNA = 'bg-muted';

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
