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

/** Lo que eligió la persona, menos la página y las filas por página (lo que cambia QUÉ resultados hay). */
export type CriteriosVista = Omit<EstadoBusqueda, 'pagina' | 'tamano'>;

/** Resultados ya buscados, filtrados, ordenados (y agrupados), todavía sin cortar en páginas. */
interface BaseResultados {
  /** Palabras del buscador (normalizadas). */
  terminos: string[];
  /** Lo escrito en los filtros "contiene" (normalizado), por campo: también se resalta en su columna. */
  porCampo: Partial<Record<Campo, string>>;
  /** Todas las filas filtradas y ordenadas (lo que se exporta). */
  filas: Fila[];
  /** Total del Excel completo, para "de N en total" (filas, o centros en la vista "Por centro"). */
  totalGeneral: number;
}
export type Resultados = (BaseResultados & { tipo: 'orden'; grupos: null }) | (BaseResultados & { tipo: 'centro'; grupos: Grupo[] });

/** Lo que muestra la tabla: filas (vista "Por orden") o centros (vista "Por centro"), ya paginados. */
export type VistaCalculada =
  | (Resultados & { tipo: 'orden'; pagina: Pagina<Fila>; contador: string })
  | (Resultados & { tipo: 'centro'; pagina: Pagina<Grupo>; contador: string });

/**
 * Busca, filtra, ordena y agrupa (el trabajo pesado: recorre todas las filas del Excel).
 * No depende de la página: cambiar de página o de filas por página no lo repite (ver paginarResultados).
 * @param totalCentros  cantidad de centros del Excel completo (para "de N en total" en la vista por centro)
 */
export function calcularResultados(datos: ResultadoLectura, criterios: CriteriosVista, totalCentros: number): Resultados {
  const filtradas = filtrarFilas(datos.filas, criterios);
  const terminos = dividirTerminos(criterios.q);
  const porCampo: Partial<Record<Campo, string>> = {
    codigoCentro: normalizarTexto(criterios.codigo),
    descripcionCentro: normalizarTexto(criterios.descripcion),
    ordenCompra: normalizarTexto(criterios.orden),
  };

  if (criterios.vista === 'centro') {
    const grupos = ordenarGrupos(agruparPorCentro(filtradas), criterios.ordenarPor, criterios.direccion);
    return { tipo: 'centro', grupos, filas: grupos.flatMap((g) => g.filas), terminos, porCampo, totalGeneral: totalCentros };
  }
  const col = datos.columnas.find((c) => c.clave === criterios.ordenarPor);
  const ordenadas = col ? ordenarFilas(filtradas, col.indice, criterios.direccion) : filtradas;
  return { tipo: 'orden', grupos: null, filas: ordenadas, terminos, porCampo, totalGeneral: datos.filas.length };
}

/** Corta los resultados en páginas y arma el contador (trabajo liviano). */
export function paginarResultados(resultados: Resultados, pagina: number, tamano: number): VistaCalculada {
  if (resultados.tipo === 'centro') {
    const p = paginar(resultados.grupos, pagina, tamano);
    return { ...resultados, pagina: p, contador: textoContador(p, resultados.totalGeneral, 'centro') };
  }
  const p = paginar(resultados.filas, pagina, tamano);
  return { ...resultados, pagina: p, contador: textoContador(p, resultados.totalGeneral, 'orden') };
}

/**
 * Busca, filtra, ordena, agrupa y pagina (calcularResultados + paginarResultados).
 * @param totalCentros  cantidad de centros del Excel completo (para "de N en total" en la vista por centro)
 */
export function calcularVista(datos: ResultadoLectura, estado: EstadoBusqueda, totalCentros: number): VistaCalculada {
  return paginarResultados(calcularResultados(datos, estado, totalCentros), estado.pagina, estado.tamano);
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
export function textoActualizado(ultimaConsulta: Date | null, modificado: Date | null | undefined, minutos: number): string {
  const partes: string[] = [];
  if (ultimaConsulta) partes.push(`Datos actualizados a las ${hora(ultimaConsulta)}`);
  if (modificado) partes.push(`Excel modificado el ${fecha(modificado)} a las ${hora(modificado)}`);
  if (minutos > 0) partes.push(`se actualiza solo cada ${minutos} min`);
  return partes.join(' · ');
}
