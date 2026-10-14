// =============================================================================
// estado-url.ts — Guarda la búsqueda y los filtros en la dirección (URL), en la parte "query" (?…).
//
// Así se puede copiar el enlace y compartirlo: quien lo abra verá la misma búsqueda.
// Ejemplo: https://…/centros?q=cableado&cliente=Cliente+Demo+A&estado=Abierta
// La forma de ver los resultados ("Por orden" / "Por centro") ya NO va en la query: es la ruta
// (/ordenes o /centros, ver rutas.ts). ?vista=centro se sigue LEYENDO (enlaces de antes).
// (Se evitan los nombres "code", "state" y "error" porque los usa el inicio de sesión de Microsoft.)
// =============================================================================

import { CLAVES_FILTRO, FILTROS_VACIOS } from './filtros.ts';
import type { ClaveFiltro, EstadoBusqueda } from './tipos.ts';

export const TAMANOS_PAGINA: readonly number[] = [25, 50, 100, 250];

/** Partes del estado que van en la query (la vista no: es la ruta). */
type ClaveEnUrl = Exclude<keyof EstadoBusqueda, 'vista'>;

/** Nombre del parámetro en la URL para cada parte del estado. */
const PARAMETROS: Readonly<Record<ClaveEnUrl, string>> = {
  q: 'q',
  cliente: 'cliente',
  codigo: 'codigo',
  descripcion: 'desc',
  orden: 'oc',
  tipo: 'tipo',
  estado: 'estado',
  ordenarPor: 'ord',
  direccion: 'dir',
  pagina: 'pag',
  tamano: 'tam',
};

export function estadoInicial(tamanoPorDefecto = 50): EstadoBusqueda {
  return {
    ...FILTROS_VACIOS, // buscador (q) y filtros, todos vacíos
    vista: 'orden',
    ordenarPor: '',
    direccion: 'asc',
    pagina: 1,
    tamano: tamanoPorDefecto,
  };
}

/** Lee el estado desde "?q=…&cliente=…". Valores raros se reemplazan por los de defecto. */
export function leerEstadoDeUrl(busqueda: string | null | undefined, tamanoPorDefecto = 50): EstadoBusqueda {
  const estado = estadoInicial(tamanoPorDefecto);
  const p = new URLSearchParams(busqueda || '');
  const textos: (ClaveFiltro | 'ordenarPor')[] = [...CLAVES_FILTRO, 'ordenarPor'];
  for (const clave of textos) {
    const valor = p.get(PARAMETROS[clave]);
    if (valor !== null) estado[clave] = valor.slice(0, 200);
  }
  // Enlaces de antes de React Router (hoy la vista es la ruta /centros: ver rutas.ts).
  if (p.get('vista') === 'centro') estado.vista = 'centro';
  if (p.get('dir') === 'desc') estado.direccion = 'desc';
  const pagina = parseInt(p.get('pag') ?? '', 10);
  if (Number.isInteger(pagina) && pagina >= 1) estado.pagina = pagina;
  const tamano = parseInt(p.get('tam') ?? '', 10);
  if (TAMANOS_PAGINA.includes(tamano) || tamano === tamanoPorDefecto) estado.tamano = tamano;
  return estado;
}

/**
 * Convierte el estado en "?q=…" (solo lo que difiere de lo normal, para que el enlace sea corto).
 * La vista no se escribe: es la ruta (/ordenes o /centros).
 */
export function escribirEstadoEnUrl(estado: EstadoBusqueda, tamanoPorDefecto = 50): string {
  const normal = estadoInicial(tamanoPorDefecto);
  const p = new URLSearchParams();
  for (const [clave, nombre] of Object.entries(PARAMETROS) as [ClaveEnUrl, string][]) {
    const valor: unknown = estado[clave];
    if (valor === undefined || valor === null || valor === '' || valor === normal[clave]) continue;
    if (clave === 'direccion' && !estado.ordenarPor) continue;
    p.set(nombre, String(valor));
  }
  const texto = p.toString();
  return texto ? `?${texto}` : '';
}
