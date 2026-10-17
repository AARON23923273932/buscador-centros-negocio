import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FILTROS_VACIOS } from '../logica/filtros.ts';
import { rutaDeVista } from '../logica/rutas.ts';
import type { EstadoBusqueda, ResultadoLectura, Vista } from '../logica/tipos.ts';
import { CONTROLES, ajustarEstadoAColumnas, estadoControles, type ClaveDesplegable } from '../logica/vista.ts';
import { useEstadoUrl } from './useEstadoUrl.ts';

export type ClaveTexto = 'q' | 'codigo' | 'descripcion' | 'orden';
export type Borradores = Record<ClaveTexto, string>;

const CLAVES_TEXTO: readonly ClaveTexto[] = ['q', 'codigo', 'descripcion', 'orden'];
const ESPERA_MS = 200;

const borradoresDe = (estado: EstadoBusqueda): Borradores => ({
  q: estado.q,
  codigo: estado.codigo,
  descripcion: estado.descripcion,
  orden: estado.orden,
});

export interface Busqueda {
  estado: EstadoBusqueda;
  borradores: Borradores;
  escribir: (clave: ClaveTexto, valor: string) => void;
  aplicarYa: (clave: ClaveTexto) => void;
  elegir: (clave: ClaveDesplegable, valor: string) => void;
  limpiar: () => void;
  cambiarVista: (vista: Vista) => void;
  cambiarTamano: (tamano: number) => void;
  irAPagina: (pagina: number) => void;
  ordenar: (clave: string) => void;
  ajustarAColumnas: (datos: ResultadoLectura) => void;
  setEstado: (cambio: (e: EstadoBusqueda) => EstadoBusqueda) => void;
  marcarEscrita: (consulta: string) => void;
}

export function useBusqueda(tamanoPorDefecto: number): Busqueda {
  const { estado, setEstado, navegar, lecturas, marcarEscrita } = useEstadoUrl(tamanoPorDefecto);
  const [borradores, setBorradores] = useState<Borradores>(() => borradoresDe(estado));
  const borradoresRef = useRef(borradores);
  const temporizadores = useRef(new Map<ClaveTexto, ReturnType<typeof setTimeout>>());

  const [lecturasVistas, setLecturasVistas] = useState(lecturas);
  if (lecturas !== lecturasVistas) {
    setLecturasVistas(lecturas);
    setBorradores(borradoresDe(estado));
  }
  useLayoutEffect(() => {
    borradoresRef.current = borradores;
  }, [borradores]);

  const cancelar = useCallback((clave: ClaveTexto) => {
    clearTimeout(temporizadores.current.get(clave));
    temporizadores.current.delete(clave);
  }, []);

  useEffect(() => {
    if (lecturas > 0) for (const clave of CLAVES_TEXTO) cancelar(clave);
  }, [lecturas, cancelar]);

  const cambiarBorradores = useCallback((cambio: Partial<Borradores>) => {
    borradoresRef.current = { ...borradoresRef.current, ...cambio };
    setBorradores(borradoresRef.current);
  }, []);

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
    (vista: Vista) => navegar(rutaDeVista(vista), { ...estado, vista, ordenarPor: '', direccion: 'asc', pagina: 1 }),
    [navegar, estado],
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
    marcarEscrita,
  };
}
