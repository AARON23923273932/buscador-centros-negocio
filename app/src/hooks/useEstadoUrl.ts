// =============================================================================
// useEstadoUrl — Lo que la persona eligió (búsqueda, filtros, orden, página, filas por página),
// guardado en la "query" de la dirección (?q=…&cliente=…) con React Router.
// Así el enlace se puede compartir y quien lo abra ve lo mismo (ver logica/estado-url.ts).
// La vista ("Por orden" / "Por centro") es la RUTA: /ordenes o /centros (ver logica/rutas.ts).
//
// Cómo se mantienen iguales la pantalla y la dirección:
//  - La pantalla → la dirección: cada cambio de filtro REEMPLAZA la dirección actual (useGuardarEnUrl),
//    sin agregar una entrada al historial por cada tecla. Cambiar de vista (/ordenes ↔ /centros) o abrir
//    el detalle de un centro SÍ agrega una entrada: el botón "atrás" del navegador vuelve a la anterior,
//    con la búsqueda y los filtros que tenía.
//  - La dirección → la pantalla: si la dirección cambia por fuera de la app (botón atrás/adelante, un
//    enlace), el estado se vuelve a leer de la dirección. Para distinguir unos cambios de otros se
//    recuerda la última query que escribió la app ("escrita").
// Requiere <Enrutador> (componentes/Enrutador.tsx): la dirección y el estado se actualizan juntos.
// =============================================================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { escribirEstadoEnUrl, leerEstadoDeUrl } from '../logica/estado-url.ts';
import { vistaDeRuta } from '../logica/rutas.ts';
import type { EstadoBusqueda } from '../logica/tipos.ts';

export interface EstadoUrl {
  estado: EstadoBusqueda;
  setEstado: Dispatch<SetStateAction<EstadoBusqueda>>;
  /** Va a otra ruta (agrega una entrada al historial) con un estado nuevo. Ej.: "Por orden" → /centros. */
  navegar: (ruta: string, estado: EstadoBusqueda) => void;
  /** Cuántas veces el estado se volvió a leer de la dirección (atrás/adelante, un enlace). */
  lecturas: number;
  /** Avisa qué query escribió la app en la dirección (lo usa useGuardarEnUrl). */
  marcarEscrita: (consulta: string) => void;
}

/** Estado leído de la dirección; en /ordenes y /centros la vista es la de la ruta. */
function leer(ruta: string, busqueda: string, tamanoPorDefecto: number): EstadoBusqueda {
  const estado = leerEstadoDeUrl(busqueda, tamanoPorDefecto);
  const vista = vistaDeRuta(ruta);
  return vista ? { ...estado, vista } : estado;
}

export function useEstadoUrl(tamanoPorDefecto: number): EstadoUrl {
  const ubicacion = useLocation();
  const navegarRouter = useNavigate();
  const [estado, setEstado] = useState<EstadoBusqueda>(() => leer(ubicacion.pathname, ubicacion.search, tamanoPorDefecto));
  // Última dirección revisada (React Router le da una "clave" distinta a cada navegación), la última query
  // que escribió (o leyó) la app y cuántas veces se volvió a leer el estado.
  const [sincronia, setSincronia] = useState({ clave: ubicacion.key, escrita: ubicacion.search, lecturas: 0 });

  // La dirección cambió: se ajusta el estado EN ESTE MISMO dibujo (no en un efecto), así ninguna parte de
  // la pantalla llega a ver la dirección nueva con el estado viejo (ni se escribe un estado viejo encima).
  if (ubicacion.key !== sincronia.clave) {
    let nuevo = estado;
    let { escrita, lecturas } = sincronia;
    if (ubicacion.search !== escrita) {
      // No la escribió la app (botón atrás/adelante, un enlace): si dice otra cosa, se vuelve a leer.
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

  // navigate() de React Router cambia cuando cambia la ruta: se usa siempre el último.
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

/**
 * Copia el estado a la dirección actual, REEMPLAZÁNDOLA (sin agregar una entrada al historial).
 * estado = null: todavía no hay nada que guardar (el Excel no se leyó) o se está yendo a otra ruta.
 */
export function useGuardarEnUrl(estado: EstadoBusqueda | null, tamanoPorDefecto: number, marcarEscrita: (consulta: string) => void): void {
  const consulta = estado ? escribirEstadoEnUrl(estado, tamanoPorDefecto) : null;
  const ubicacion = useLocation();
  const navegarRouter = useNavigate();
  // El efecto debe correr SOLO cuando cambia lo que se guarda (no cuando cambia la dirección: si no, al
  // volver atrás escribiría el estado anterior encima). La dirección y navigate() se leen de aquí.
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
