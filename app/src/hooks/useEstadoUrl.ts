// =============================================================================
// useEstadoUrl — Lo que la persona eligió (búsqueda, filtros, vista, orden, página),
// leído de la dirección al abrir y copiado a la dirección cada vez que cambia.
// Así el enlace se puede compartir y quien lo abra ve lo mismo (ver logica/estado-url.ts).
// =============================================================================

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { escribirEstadoEnUrl, leerEstadoDeUrl } from '../logica/estado-url.ts';
import type { EstadoBusqueda } from '../logica/tipos.ts';

export function useEstadoUrl(tamanoPorDefecto: number): [EstadoBusqueda, Dispatch<SetStateAction<EstadoBusqueda>>] {
  return useState<EstadoBusqueda>(() => leerEstadoDeUrl(location.search, tamanoPorDefecto));
}

/**
 * Copia el estado a la dirección (sin agregar una entrada al historial del navegador).
 * estado = null: todavía no hay nada que guardar (el Excel no se leyó).
 */
export function useGuardarEnUrl(estado: EstadoBusqueda | null, tamanoPorDefecto: number): void {
  const consulta = estado ? escribirEstadoEnUrl(estado, tamanoPorDefecto) : null;
  useEffect(() => {
    if (consulta === null) return;
    const nueva = `${location.pathname}${consulta}${location.hash}`;
    if (nueva !== `${location.pathname}${location.search}${location.hash}`) {
      history.replaceState(history.state, '', nueva);
    }
  }, [consulta]);
}
