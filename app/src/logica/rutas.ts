// =============================================================================
// rutas.ts — Las direcciones (rutas) de la app y las reglas para pasar de una a otra
// (funciones puras: se prueban sin navegador). Las rutas en sí se declaran con React Router
// en componentes/RutasApp.tsx.
//
//   /                  → lleva a /ordenes (conservando la búsqueda: ?q=…)
//   /ordenes           → resultados "Por orden" (una fila por fila del Excel)
//   /centros           → resultados "Por centro de negocio"
//   /centros/:codigo   → detalle de un centro (sus datos y todas sus órdenes)
//   cualquier otra     → "Página no encontrada"
//
// La búsqueda, los filtros, el orden y la página van en la "query" (?q=…&cliente=…), ver estado-url.ts.
// Enlaces viejos con ?vista=centro (antes de React Router) llevan a /centros.
// =============================================================================

import type { Vista } from './tipos.ts';

export const RUTA_ORDENES = '/ordenes';
export const RUTA_CENTROS = '/centros';

/**
 * Carpeta donde está publicada la app ("/" = la raíz del dominio, como en Netlify).
 * Viene de "base" en vite.config.ts.
 */
export const BASE_APP: string = import.meta.env.BASE_URL || '/';

/**
 * Dirección de un archivo publicado junto a la app (config.json, el Excel de ejemplo, redirect.html…).
 * Siempre desde la carpeta de la app y no desde la ruta actual: en /centros/A2338PY01 la dirección
 * relativa "config.json" sería /centros/config.json, que no existe.
 * Las direcciones completas (https://…) y las que empiezan con "/" se dejan tal cual.
 */
export function rutaPublica(archivo: string, base: string = BASE_APP): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(archivo) || archivo.startsWith('/')) return archivo;
  const carpeta = base.endsWith('/') ? base : `${base}/`;
  return `${carpeta}${archivo.replace(/^\.\//, '')}`;
}

/** Ruta de cada forma de ver los resultados. */
export function rutaDeVista(vista: Vista): string {
  return vista === 'centro' ? RUTA_CENTROS : RUTA_ORDENES;
}

/** Quita la "/" final (React Router acepta /ordenes/ igual que /ordenes). */
const sinBarraFinal = (ruta: string) => (ruta.length > 1 ? ruta.replace(/\/+$/, '') : ruta);

/** Forma de ver los resultados según la ruta (null si la ruta no es una lista: detalle, 404…). */
export function vistaDeRuta(ruta: string): Vista | null {
  const r = sinBarraFinal(ruta).toLowerCase();
  if (r === RUTA_ORDENES) return 'orden';
  if (r === RUTA_CENTROS) return 'centro';
  return null;
}

/** Ruta del detalle de un centro. El código se codifica: puede traer espacios, "/", "#", "?"… */
export function rutaDetalleCentro(codigo: string): string {
  return `${RUTA_CENTROS}/${encodeURIComponent(codigo)}`;
}

/** Ruta + query (lo que se le pasa a navigate() o a <Navigate to>). */
export interface Destino {
  pathname: string;
  search: string;
}

/**
 * Enlaces de antes de React Router y la página de inicio:
 *  - "/" (o "/index.html") → /ordenes, o /centros si el enlace trae ?vista=centro;
 *  - /ordenes?vista=centro → /centros;
 *  - el parámetro "vista" ya no se usa (la vista es la ruta): se quita.
 * El resto de la query (búsqueda, filtros, orden, página…) se conserva.
 * Devuelve null si no hay que cambiar nada.
 */
export function destinoCompatible(ruta: string, busqueda: string): Destino | null {
  const r = sinBarraFinal(ruta).toLowerCase();
  const inicio = r === '/' || r === '/index.html';
  const actual = vistaDeRuta(r);
  if (!inicio && actual === null) return null;

  const parametros = new URLSearchParams(busqueda);
  const vistaPedida = parametros.get('vista');
  if (!inicio && vistaPedida === null) return null;
  parametros.delete('vista');
  const resto = parametros.toString();
  const search = resto ? `?${resto}` : '';

  if (vistaPedida === 'centro') return { pathname: RUTA_CENTROS, search };
  if (inicio) return { pathname: RUTA_ORDENES, search };
  return { pathname: sinBarraFinal(ruta), search };
}

/** Lo que el enlace del código guarda en el historial: desde qué lista se abrió el detalle. */
export interface EstadoNavegacion {
  desde?: string;
}

/**
 * A qué lista vuelve el botón "Volver" del detalle: la lista desde la que se abrió (/ordenes o /centros)
 * o, si se abrió el detalle directamente (enlace compartido, recarga), la lista de centros.
 */
export function rutaVolver(estado: unknown): string {
  const desde = (estado as EstadoNavegacion | null)?.desde;
  return typeof desde === 'string' && vistaDeRuta(desde) !== null ? sinBarraFinal(desde) : RUTA_CENTROS;
}
