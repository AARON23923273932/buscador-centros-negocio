// =============================================================================
// useBusqueda — Búsqueda, filtros, vista, orden y página (el "estado" de la pantalla).
//
// Las cajas de texto (buscador y filtros "contiene") esperan 200 ms después de la última
// tecla antes de filtrar: lo escrito va primero a "borradores" (lo que se ve en la caja)
// y después al estado (lo que filtra y lo que queda en la URL). Enter filtra de inmediato.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { FILTROS_VACIOS } from '../logica/filtros.ts';
import type { EstadoBusqueda, ResultadoLectura, Vista } from '../logica/tipos.ts';
import { CONTROLES, ajustarEstadoAColumnas, estadoControles, type ClaveDesplegable } from '../logica/vista.ts';
import { useEstadoUrl } from './useEstadoUrl.ts';

/** Cajas de texto: el buscador (q) y los filtros "contiene". */
export type ClaveTexto = 'q' | 'codigo' | 'descripcion' | 'orden';
export type Borradores = Record<ClaveTexto, string>;

const CLAVES_TEXTO: readonly ClaveTexto[] = ['q', 'codigo', 'descripcion', 'orden'];
const ESPERA_MS = 200;

export interface Busqueda {
  estado: EstadoBusqueda;
  /** Lo que se ve escrito en cada caja de texto. */
  borradores: Borradores;
  /** Se escribió en una caja: filtra 200 ms después de la última tecla. */
  escribir: (clave: ClaveTexto, valor: string) => void;
  /** Enter (o el formulario del buscador): filtra ya con lo escrito. */
  aplicarYa: (clave: ClaveTexto) => void;
  /** Se eligió una opción de un desplegable. */
  elegir: (clave: ClaveDesplegable, valor: string) => void;
  /** "Limpiar filtros": vacía el buscador y todos los filtros. */
  limpiar: () => void;
  cambiarVista: (vista: Vista) => void;
  cambiarTamano: (tamano: number) => void;
  irAPagina: (pagina: number) => void;
  /** Clic en un título: ordena por esa columna (si ya estaba, invierte el orden). */
  ordenar: (clave: string) => void;
  /** Corrige el estado según las columnas del Excel recién leído (ver logica/vista.ts). */
  ajustarAColumnas: (datos: ResultadoLectura) => void;
  setEstado: (cambio: (e: EstadoBusqueda) => EstadoBusqueda) => void;
}

export function useBusqueda(tamanoPorDefecto: number): Busqueda {
  const [estado, setEstado] = useEstadoUrl(tamanoPorDefecto);
  const [borradores, setBorradores] = useState<Borradores>(() => ({
    q: estado.q,
    codigo: estado.codigo,
    descripcion: estado.descripcion,
    orden: estado.orden,
  }));
  // Copia siempre al día de los borradores (Enter debe usar lo último escrito).
  const borradoresRef = useRef(borradores);
  const temporizadores = useRef(new Map<ClaveTexto, ReturnType<typeof setTimeout>>());

  const cancelar = useCallback((clave: ClaveTexto) => {
    clearTimeout(temporizadores.current.get(clave));
    temporizadores.current.delete(clave);
  }, []);

  const cambiarBorradores = useCallback((cambio: Partial<Borradores>) => {
    borradoresRef.current = { ...borradoresRef.current, ...cambio };
    setBorradores(borradoresRef.current);
  }, []);

  /** Cambia un filtro y vuelve a la página 1. */
  const filtrar = useCallback(
    (clave: ClaveTexto | ClaveDesplegable, valor: string) => setEstado((e) => ({ ...e, [clave]: valor, pagina: 1 })),
    [setEstado],
  );

  const escribir = useCallback(
    (clave: ClaveTexto, valor: string) => {
      cambiarBorradores({ [clave]: valor });
      cancelar(clave);
      temporizadores.current.set(
        clave,
        setTimeout(() => {
          temporizadores.current.delete(clave);
          filtrar(clave, valor);
        }, ESPERA_MS),
      );
    },
    [cambiarBorradores, cancelar, filtrar],
  );

  const aplicarYa = useCallback(
    (clave: ClaveTexto) => {
      cancelar(clave);
      filtrar(clave, borradoresRef.current[clave]);
    },
    [cancelar, filtrar],
  );

  const elegir = useCallback((clave: ClaveDesplegable, valor: string) => filtrar(clave, valor), [filtrar]);

  const limpiar = useCallback(() => {
    for (const clave of CLAVES_TEXTO) cancelar(clave);
    cambiarBorradores({ q: '', codigo: '', descripcion: '', orden: '' });
    setEstado((e) => ({ ...e, ...FILTROS_VACIOS, pagina: 1 }));
  }, [cancelar, cambiarBorradores, setEstado]);

  const cambiarVista = useCallback(
    (vista: Vista) => setEstado((e) => ({ ...e, vista, ordenarPor: '', direccion: 'asc', pagina: 1 })),
    [setEstado],
  );

  const cambiarTamano = useCallback((tamano: number) => setEstado((e) => ({ ...e, tamano, pagina: 1 })), [setEstado]);

  const irAPagina = useCallback((pagina: number) => setEstado((e) => ({ ...e, pagina })), [setEstado]);

  const ordenar = useCallback(
    (clave: string) =>
      setEstado((e) =>
        e.ordenarPor === clave
          ? { ...e, direccion: e.direccion === 'asc' ? 'desc' : 'asc', pagina: 1 }
          : { ...e, ordenarPor: clave, direccion: 'asc', pagina: 1 },
      ),
    [setEstado],
  );

  const ajustarAColumnas = useCallback(
    (datos: ResultadoLectura) => {
      setEstado((e) => ajustarEstadoAColumnas(e, datos));
      // Las cajas de texto de filtros que no se pueden usar se vacían (las demás no se tocan:
      // la persona podría estar escribiendo).
      const controles = estadoControles(datos);
      const vaciar: Partial<Borradores> = {};
      for (const { clave } of CONTROLES) {
        if ((clave === 'codigo' || clave === 'descripcion' || clave === 'orden') && !controles[clave].disponible) {
          cancelar(clave);
          vaciar[clave] = '';
        }
      }
      if (Object.keys(vaciar).length) cambiarBorradores(vaciar);
    },
    [setEstado, cancelar, cambiarBorradores],
  );

  // Al cerrar la pantalla no deben quedar filtros pendientes.
  useEffect(() => {
    const pendientes = temporizadores.current;
    return () => {
      for (const t of pendientes.values()) clearTimeout(t);
      pendientes.clear();
    };
  }, []);

  return {
    estado,
    borradores,
    escribir,
    aplicarYa,
    elegir,
    limpiar,
    cambiarVista,
    cambiarTamano,
    irAPagina,
    ordenar,
    ajustarAColumnas,
    setEstado,
  };
}
