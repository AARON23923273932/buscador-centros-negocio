// =============================================================================
// estado-url.ts — Guarda la búsqueda y los filtros en la dirección (URL).
//
// Así se puede copiar el enlace y compartirlo: quien lo abra verá la misma búsqueda.
// Ejemplo: https://…/?q=cableado&cliente=Cliente+Demo+A&estado=Abierta&vista=centro
// (Se evitan los nombres "code", "state" y "error" porque los usa el inicio de sesión de Microsoft.)
// =============================================================================

import { CLAVES_FILTRO, FILTROS_VACIOS } from './filtros.ts';
import type { ClaveFiltro, EstadoBusqueda } from './tipos.ts';

export const TAMANOS_PAGINA: readonly number[] = [25, 50, 100, 250];

/** Nombre del parámetro en la URL para cada parte del estado. */
const PARAMETROS: Readonly<Record<keyof EstadoBusqueda, string>> = {
  q: 'q',
  cliente: 'cliente',
  codigo: 'codigo',
  descripcion: 'desc',
  orden: 'oc',
  tipo: 'tipo',
  estado: 'estado',
  vista: 'vista',
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
  if (p.get('vista') === 'centro') estado.vista = 'centro';
  if (p.get('dir') === 'desc') estado.direccion = 'desc';
  const pagina = parseInt(p.get('pag') ?? '', 10);
  if (Number.isInteger(pagina) && pagina >= 1) estado.pagina = pagina;
  const tamano = parseInt(p.get('tam') ?? '', 10);
  if (TAMANOS_PAGINA.includes(tamano) || tamano === tamanoPorDefecto) estado.tamano = tamano;
  return estado;
}

/** Convierte el estado en "?q=…" (solo lo que difiere de lo normal, para que el enlace sea corto). */
export function escribirEstadoEnUrl(estado: EstadoBusqueda, tamanoPorDefecto = 50): string {
  const normal = estadoInicial(tamanoPorDefecto);
  const p = new URLSearchParams();
  for (const [clave, nombre] of Object.entries(PARAMETROS) as [keyof EstadoBusqueda, string][]) {
    const valor: unknown = estado[clave];
    if (valor === undefined || valor === null || valor === '' || valor === normal[clave]) continue;
    if (clave === 'direccion' && !estado.ordenarPor) continue;
    p.set(nombre, String(valor));
  }
  const texto = p.toString();
  return texto ? `?${texto}` : '';
}
