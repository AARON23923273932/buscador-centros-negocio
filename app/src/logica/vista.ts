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

export type ClaveControl = Exclude<ClaveFiltro, 'q'>;

export const CONTROLES: readonly { campo: Campo; clave: ClaveControl }[] = [
  { campo: 'cliente', clave: 'cliente' },
  { campo: 'codigoCentro', clave: 'codigo' },
  { campo: 'descripcionCentro', clave: 'descripcion' },
  { campo: 'ordenCompra', clave: 'orden' },
  { campo: 'tipoOrden', clave: 'tipo' },
  { campo: 'estado', clave: 'estado' },
];

export type ClaveDesplegable = 'cliente' | 'tipo' | 'estado';
export const DESPLEGABLES: readonly { clave: ClaveDesplegable; campo: Campo }[] = [
  { clave: 'cliente', campo: 'cliente' },
  { clave: 'tipo', campo: 'tipoOrden' },
  { clave: 'estado', campo: 'estado' },
];

export interface EstadoControl {
  disponible: boolean;
  motivo: string;
}

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

export function opcionesDesplegables(datos: ResultadoLectura | null): Record<ClaveDesplegable, string[]> {
  const resultado = {} as Record<ClaveDesplegable, string[]>;
  for (const { clave, campo } of DESPLEGABLES) resultado[clave] = datos ? valoresUnicos(datos.filas, campo) : [];
  return resultado;
}

export function vistaCentroDisponible(datos: ResultadoLectura | null): boolean {
  return !datos || 'codigoCentro' in datos.mapa || 'descripcionCentro' in datos.mapa;
}

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

export type CriteriosVista = Omit<EstadoBusqueda, 'pagina' | 'tamano'>;

interface BaseResultados {
  terminos: string[];
  porCampo: Partial<Record<Campo, string>>;
  filas: Fila[];
  totalGeneral: number;
}
export type Resultados = (BaseResultados & { tipo: 'orden'; grupos: null }) | (BaseResultados & { tipo: 'centro'; grupos: Grupo[] });

export type VistaCalculada =
  | (Resultados & { tipo: 'orden'; pagina: Pagina<Fila>; contador: string })
  | (Resultados & { tipo: 'centro'; pagina: Pagina<Grupo>; contador: string });

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

export function paginarResultados(resultados: Resultados, pagina: number, tamano: number): VistaCalculada {
  if (resultados.tipo === 'centro') {
    const p = paginar(resultados.grupos, pagina, tamano);
    return { ...resultados, pagina: p, contador: textoContador(p, resultados.totalGeneral, 'centro') };
  }
  const p = paginar(resultados.filas, pagina, tamano);
  return { ...resultados, pagina: p, contador: textoContador(p, resultados.totalGeneral, 'orden') };
}

export function calcularVista(datos: ResultadoLectura, estado: EstadoBusqueda, totalCentros: number): VistaCalculada {
  return paginarResultados(calcularResultados(datos, estado, totalCentros), estado.pagina, estado.tamano);
}

export function terminosDeColumna(
  terminos: readonly string[],
  porCampo: Partial<Record<Campo, string>>,
  columna: Pick<Columna, 'campo'>,
): string[] {
  const extra = columna.campo ? porCampo[columna.campo] : '';
  return extra ? [...terminos, extra] : [...terminos];
}

export function textoActualizado(ultimaConsulta: Date | null, modificado: Date | null | undefined, minutos: number): string {
  const partes: string[] = [];
  if (ultimaConsulta) partes.push(`Datos actualizados a las ${hora(ultimaConsulta)}`);
  if (modificado) partes.push(`Excel modificado el ${fecha(modificado)} a las ${hora(modificado)}`);
  if (minutos > 0) partes.push(`se actualiza solo cada ${minutos} min`);
  return partes.join(' · ');
}
