// =============================================================================
// vista.ts — Qué se ve en la pantalla principal, calculado a partir de los datos
// del Excel y de lo que la persona eligió (funciones puras: se prueban sin navegador).
//
//   datos del Excel + estado (búsqueda, filtros, vista, orden, página)
//        ──► calcularVista() ──► filas o centros de la página + contador
// =============================================================================

import {
  agruparPorCentro,
  dividirTerminos,
  filtrarFilas,
  normalizarTexto,
  ordenarFilas,
  ordenarGrupos,
  paginar,
  sePuedeFiltrar,
  valoresUnicos,
} from './filtros.ts';
import { fecha, hora } from './formato.ts';
import { textoContador } from './tabla.ts';
import type { Campo, ClaveFiltro, Columna, EstadoBusqueda, Fila, Grupo, Pagina, ResultadoLectura } from './tipos.ts';

/** Filtros del panel (todos menos el buscador). */
export type ClaveControl = Exclude<ClaveFiltro, 'q'>;

/** Filtros del panel: campo del Excel que filtra cada uno. */
export const CONTROLES: readonly { campo: Campo; clave: ClaveControl }[] = [
  { campo: 'cliente', clave: 'cliente' },
  { campo: 'codigoCentro', clave: 'codigo' },
  { campo: 'descripcionCentro', clave: 'descripcion' },
  { campo: 'ordenCompra', clave: 'orden' },
  { campo: 'tipoOrden', clave: 'tipo' },
  { campo: 'estado', clave: 'estado' },
];

/** Filtros desplegables (se elige una de las opciones que hay en el Excel). */
export type ClaveDesplegable = 'cliente' | 'tipo' | 'estado';
export const DESPLEGABLES: readonly { clave: ClaveDesplegable; campo: Campo }[] = [
  { clave: 'cliente', campo: 'cliente' },
  { clave: 'tipo', campo: 'tipoOrden' },
  { clave: 'estado', campo: 'estado' },
];

/** ¿Se puede usar un filtro? Si no, "motivo" es el texto de ayuda (title) del control desactivado. */
export interface EstadoControl {
  disponible: boolean;
  motivo: string;
}

/** Estado de cada filtro del panel. Antes de leer el Excel, todos están disponibles. */
export function estadoControles(datos: ResultadoLectura | null): Record<ClaveControl, EstadoControl> {
  const resultado = {} as Record<ClaveControl, EstadoControl>;
  for (const { campo, clave } of CONTROLES) {
    const disponible = !datos || sePuedeFiltrar(campo, datos.mapa, datos.filas);
    let motivo = '';
    if (!disponible && datos) motivo = campo in datos.mapa ? 'Esta columna del Excel está vacía' : 'No se encontró esta columna en el Excel';
    resultado[clave] = { disponible, motivo };
  }
  return resultado;
}

/** Opciones de cada desplegable (los valores del Excel, sin "Todos"). */
export function opcionesDesplegables(datos: ResultadoLectura | null): Record<ClaveDesplegable, string[]> {
  const resultado = {} as Record<ClaveDesplegable, string[]>;
  for (const { clave, campo } of DESPLEGABLES) resultado[clave] = datos ? valoresUnicos(datos.filas, campo) : [];
  return resultado;
}

/** La vista "Por centro" necesita la columna del código o la de la descripción. */
export function vistaCentroDisponible(datos: ResultadoLectura | null): boolean {
  return !datos || 'codigoCentro' in datos.mapa || 'descripcionCentro' in datos.mapa;
}

/**
 * Corrige lo que eligió la persona (o lo que vino en el enlace) según el Excel recién leído:
 *  - los filtros de columnas que no existen (o están vacías) se vacían;
 *  - en los desplegables, si el valor existe con otras mayúsculas/tildes, se usa el del Excel;
 *  - sin columna de centro, la vista "Por centro" vuelve a "Por orden".
 */
export function ajustarEstadoAColumnas(estado: EstadoBusqueda, datos: ResultadoLectura): EstadoBusqueda {
  const e = { ...estado };
  const controles = estadoControles(datos);
  for (const { clave } of CONTROLES) {
    if (!controles[clave].disponible) e[clave] = '';
  }
  const opciones = opcionesDesplegables(datos);
  for (const { clave } of DESPLEGABLES) {
    const igual = opciones[clave].find((v) => normalizarTexto(v) === normalizarTexto(e[clave]));
    if (igual !== undefined) e[clave] = igual;
  }
  if (!vistaCentroDisponible(datos) && e.vista === 'centro') e.vista = 'orden';
  return e;
}

/** Lo que muestra la tabla: filas (vista "Por orden") o centros (vista "Por centro"), ya paginados. */
interface BaseVista {
  /** Palabras del buscador (normalizadas). */
  terminos: string[];
  /** Lo escrito en los filtros "contiene" (normalizado), por campo: también se resalta en su columna. */
  porCampo: Partial<Record<Campo, string>>;
  /** Todas las filas filtradas y ordenadas (lo que se exporta). */
  filas: Fila[];
  /** Texto del contador ("Mostrando 1–50 de 63 resultados (de 80 en total)"). */
  contador: string;
}
export type VistaCalculada =
  | (BaseVista & { tipo: 'orden'; pagina: Pagina<Fila>; grupos: null })
  | (BaseVista & { tipo: 'centro'; pagina: Pagina<Grupo>; grupos: Grupo[] });

/**
 * Busca, filtra, ordena, agrupa y pagina.
 * @param totalCentros  cantidad de centros del Excel completo (para "de N en total" en la vista por centro)
 */
export function calcularVista(datos: ResultadoLectura, estado: EstadoBusqueda, totalCentros: number): VistaCalculada {
  const filtradas = filtrarFilas(datos.filas, estado);
  const terminos = dividirTerminos(estado.q);
  const porCampo: Partial<Record<Campo, string>> = {
    codigoCentro: normalizarTexto(estado.codigo),
    descripcionCentro: normalizarTexto(estado.descripcion),
    ordenCompra: normalizarTexto(estado.orden),
  };

  if (estado.vista === 'centro') {
    const grupos = ordenarGrupos(agruparPorCentro(filtradas), estado.ordenarPor, estado.direccion);
    const pagina = paginar(grupos, estado.pagina, estado.tamano);
    return {
      tipo: 'centro',
      pagina,
      grupos,
      filas: grupos.flatMap((g) => g.filas),
      terminos,
      porCampo,
      contador: textoContador(pagina, totalCentros, 'centro'),
    };
  }
  const col = datos.columnas.find((c) => c.clave === estado.ordenarPor);
  const ordenadas = col ? ordenarFilas(filtradas, col.indice, estado.direccion) : filtradas;
  const pagina = paginar(ordenadas, estado.pagina, estado.tamano);
  return {
    tipo: 'orden',
    pagina,
    grupos: null,
    filas: ordenadas,
    terminos,
    porCampo,
    contador: textoContador(pagina, datos.filas.length, 'orden'),
  };
}

/** Palabras que se resaltan en una columna: las del buscador + lo escrito en el filtro de esa columna. */
export function terminosDeColumna(
  terminos: readonly string[],
  porCampo: Partial<Record<Campo, string>>,
  columna: Pick<Columna, 'campo'>,
): string[] {
  const extra = columna.campo ? porCampo[columna.campo] : '';
  return extra ? [...terminos, extra] : [...terminos];
}

/** "Datos actualizados a las 14:05 · Excel modificado el 08/10/2026 a las 16:45 · se actualiza solo cada 10 min" */
export function textoActualizado(ultimaConsulta: Date | null, modificado: Date | null | undefined, minutos: unknown): string {
  const partes: string[] = [];
  if (ultimaConsulta) partes.push(`Datos actualizados a las ${hora(ultimaConsulta)}`);
  if (modificado) partes.push(`Excel modificado el ${fecha(modificado)} a las ${hora(modificado)}`);
  const min = Number(minutos);
  if (min > 0) partes.push(`se actualiza solo cada ${min} min`);
  return partes.join(' · ');
}
