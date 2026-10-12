// =============================================================================
// estado-url.js — Guarda la búsqueda y los filtros en la dirección (URL).
//
// Así se puede copiar el enlace y compartirlo: quien lo abra verá la misma búsqueda.
// Ejemplo: https://…/?q=cableado&cliente=Cliente+Demo+A&estado=Abierta&vista=centro
// (Se evitan los nombres "code", "state" y "error" porque los usa el inicio de sesión de Microsoft.)
// =============================================================================

import { FILTROS_VACIOS } from './filtros.js';

export const TAMANOS_PAGINA = [25, 50, 100, 250];

/** Nombre del parámetro en la URL para cada parte del estado. */
const PARAMETROS = {
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

export function estadoInicial(tamanoPorDefecto = 50) {
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
export function leerEstadoDeUrl(busqueda, tamanoPorDefecto = 50) {
  const estado = estadoInicial(tamanoPorDefecto);
  const p = new URLSearchParams(busqueda || '');
  for (const clave of [...Object.keys(FILTROS_VACIOS), 'ordenarPor']) {
    const valor = p.get(PARAMETROS[clave]);
    if (valor !== null) estado[clave] = valor.slice(0, 200);
  }
  if (p.get('vista') === 'centro') estado.vista = 'centro';
  if (p.get('dir') === 'desc') estado.direccion = 'desc';
  const pagina = parseInt(p.get('pag'), 10);
  if (Number.isInteger(pagina) && pagina >= 1) estado.pagina = pagina;
  const tamano = parseInt(p.get('tam'), 10);
  if (TAMANOS_PAGINA.includes(tamano) || tamano === tamanoPorDefecto) estado.tamano = tamano;
  return estado;
}

/** Convierte el estado en "?q=…" (solo lo que difiere de lo normal, para que el enlace sea corto). */
export function escribirEstadoEnUrl(estado, tamanoPorDefecto = 50) {
  const normal = estadoInicial(tamanoPorDefecto);
  const p = new URLSearchParams();
  for (const [clave, nombre] of Object.entries(PARAMETROS)) {
    const valor = estado[clave];
    if (valor === undefined || valor === null || valor === '' || valor === normal[clave]) continue;
    if (clave === 'direccion' && !estado.ordenarPor) continue;
    p.set(nombre, String(valor));
  }
  const texto = p.toString();
  return texto ? `?${texto}` : '';
}
