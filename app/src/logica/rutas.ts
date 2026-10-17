import type { Vista } from './tipos.ts';

export const RUTA_ORDENES = '/ordenes';
export const RUTA_CENTROS = '/centros';

export const BASE_APP: string = import.meta.env.BASE_URL || '/';

export function rutaPublica(archivo: string, base: string = BASE_APP): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(archivo) || archivo.startsWith('/')) return archivo;
  const carpeta = base.endsWith('/') ? base : `${base}/`;
  return `${carpeta}${archivo.replace(/^\.\//, '')}`;
}

export function rutaDeVista(vista: Vista): string {
  return vista === 'centro' ? RUTA_CENTROS : RUTA_ORDENES;
}

const sinBarraFinal = (ruta: string) => (ruta.length > 1 ? ruta.replace(/\/+$/, '') : ruta);

export function vistaDeRuta(ruta: string): Vista | null {
  const r = sinBarraFinal(ruta).toLowerCase();
  if (r === RUTA_ORDENES) return 'orden';
  if (r === RUTA_CENTROS) return 'centro';
  return null;
}

export function rutaDetalleCentro(codigo: string): string {
  return `${RUTA_CENTROS}/${encodeURIComponent(codigo)}`;
}

export function codigoEnlazable(codigo: string): boolean {
  return codigo !== '.' && codigo !== '..';
}

export function codigoDeRuta(ruta: string): string | null {
  const segmento = /^\/centros\/([^/]+)\/*$/i.exec(ruta)?.[1];
  if (segmento === undefined) return null;
  try {
    return decodeURIComponent(segmento);
  } catch {
    return segmento;
  }
}

export interface Destino {
  pathname: string;
  search: string;
}

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

export interface EstadoNavegacion {
  desde?: string;
}

export function rutaVolver(estado: unknown): string {
  const desde = (estado as EstadoNavegacion | null)?.desde;
  return typeof desde === 'string' && vistaDeRuta(desde) !== null ? sinBarraFinal(desde) : RUTA_CENTROS;
}
