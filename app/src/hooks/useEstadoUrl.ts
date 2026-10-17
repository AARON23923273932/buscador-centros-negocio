import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { escribirEstadoEnUrl, leerEstadoDeUrl } from '../logica/estado-url.ts';
import { vistaDeRuta } from '../logica/rutas.ts';
import type { EstadoBusqueda } from '../logica/tipos.ts';

export interface EstadoUrl {
  estado: EstadoBusqueda;
  setEstado: Dispatch<SetStateAction<EstadoBusqueda>>;
  navegar: (ruta: string, estado: EstadoBusqueda) => void;
  lecturas: number;
  marcarEscrita: (consulta: string) => void;
}

function leer(ruta: string, busqueda: string, tamanoPorDefecto: number): EstadoBusqueda {
  const estado = leerEstadoDeUrl(busqueda, tamanoPorDefecto);
  const vista = vistaDeRuta(ruta);
  return vista ? { ...estado, vista } : estado;
}

export function useEstadoUrl(tamanoPorDefecto: number): EstadoUrl {
  const ubicacion = useLocation();
  const navegarRouter = useNavigate();
  const [estado, setEstado] = useState<EstadoBusqueda>(() => leer(ubicacion.pathname, ubicacion.search, tamanoPorDefecto));
  const [sincronia, setSincronia] = useState({ clave: ubicacion.key, escrita: ubicacion.search, lecturas: 0 });

  if (ubicacion.key !== sincronia.clave) {
    let nuevo = estado;
    let { escrita, lecturas } = sincronia;
    if (ubicacion.search !== escrita) {
      escrita = ubicacion.search;
      const leido = leerEstadoDeUrl(ubicacion.search, tamanoPorDefecto);
      if (escribirEstadoEnUrl(leido, tamanoPorDefecto) !== escribirEstadoEnUrl(estado, tamanoPorDefecto)) {
        nuevo = { ...leido, vista: estado.vista };
        lecturas++;
      }
    }
    const vista = vistaDeRuta(ubicacion.pathname);
    if (vista && vista !== nuevo.vista) nuevo = { ...nuevo, vista };
    if (nuevo !== estado) setEstado(nuevo);
    setSincronia({ clave: ubicacion.key, escrita, lecturas });
  }

  const marcarEscrita = useCallback((consulta: string) => {
    setSincronia((s) => (s.escrita === consulta ? s : { ...s, escrita: consulta }));
  }, []);

  const navegarActual = useRef(navegarRouter);
  useLayoutEffect(() => {
    navegarActual.current = navegarRouter;
  });

  const navegar = useCallback(
    (ruta: string, nuevo: EstadoBusqueda) => {
      const search = escribirEstadoEnUrl(nuevo, tamanoPorDefecto);
      marcarEscrita(search);
      setEstado(nuevo);
      void navegarActual.current({ pathname: ruta, search });
    },
    [tamanoPorDefecto, marcarEscrita],
  );

  return { estado, setEstado, navegar, lecturas: sincronia.lecturas, marcarEscrita };
}

export function useGuardarEnUrl(estado: EstadoBusqueda | null, tamanoPorDefecto: number, marcarEscrita: (consulta: string) => void): void {
  const consulta = estado ? escribirEstadoEnUrl(estado, tamanoPorDefecto) : null;
  const ubicacion = useLocation();
  const navegarRouter = useNavigate();
  const actual = useRef({ ubicacion, navegarRouter });
  useLayoutEffect(() => {
    actual.current = { ubicacion, navegarRouter };
  });

  useEffect(() => {
    if (consulta === null) return;
    const { ubicacion: u, navegarRouter: navegar } = actual.current;
    marcarEscrita(consulta);
    if (consulta !== u.search) {
      void navegar({ pathname: u.pathname, search: consulta, hash: u.hash }, { replace: true, state: u.state });
    }
  }, [consulta, marcarEscrita]);
}
