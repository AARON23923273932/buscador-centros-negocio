// =============================================================================
// useExcel — Descarga y lee el Excel, y lo vuelve a revisar solo cada N minutos.
//
// cargar(motivo): 'inicial' (al abrir) | 'manual' (botón Actualizar) | 'auto' (cada N minutos).
// En "auto" con el Excel real, primero pregunta a Microsoft si el Excel cambió (algo muy
// liviano) y solo lo descarga de nuevo si cambió.
// =============================================================================

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Sesion } from '../logica/auth.ts';
import type { Config } from '../logica/config.ts';
import { descargarExcel, leerLibro } from '../logica/datos.ts';
import { agruparPorCentro } from '../logica/filtros.ts';
import { hora } from '../logica/formato.ts';
import { ErrorDatos, obtenerMetadatos } from '../logica/graph.ts';
import type { Accion, OrigenExcel, ResultadoLectura } from '../logica/tipos.ts';
import type { Avisar } from './useAvisoFlotante.ts';

export type MotivoCarga = 'inicial' | 'manual' | 'auto';

/** Datos del archivo leído (para "Columnas detectadas" y la auto-actualización). */
export interface InfoArchivo {
  modificado: Date | null;
  nombre: string;
  eTag: string | null;
  // Solo con el Excel de SharePoint/OneDrive: dónde se encontró (para fijarlo en config.json).
  driveId: string | null;
  itemId: string | null;
  origen: OrigenExcel | null;
}

/** Aviso rojo de arriba: mensaje + botones (Reintentar, Volver a iniciar sesión). */
export interface AvisoError {
  mensaje: string;
  acciones: Accion[];
  /** Distinto en cada error, aunque el mensaje se repita: así el lector de pantalla lo vuelve a anunciar (ver Avisos.tsx). */
  id: number;
}

export interface EstadoExcel {
  datos: ResultadoLectura | null;
  archivo: InfoArchivo | null;
  /** Última vez que se revisó el Excel. */
  ultimaConsulta: Date | null;
  cargando: boolean;
  /**
   * Qué mostrar mientras NO hay datos (cuando ya hay datos no se usa: se siguen mostrando aunque falle una actualización):
   *  - 'cargando':     primera lectura → tabla "Cargando datos del Excel…", arriba "Cargando datos del Excel…"
   *  - 'error':        la lectura falló → tabla "No hay datos para mostrar…", arriba "No se pudieron cargar los datos."
   *  - 'reintentando': se pulsó "Reintentar"/"Actualizar" después del error → tabla "Cargando…", arriba sigue
   *                    "No se pudieron cargar los datos." (igual que la versión anterior)
   */
  sinDatos: 'cargando' | 'error' | 'reintentando';
  error: AvisoError | null;
}

interface Opciones {
  config: Config;
  sesion: Sesion | null;
  avisar: Avisar;
  /** Se llama cada vez que se leyó el Excel (para ajustar los filtros a sus columnas). */
  alCargar: (datos: ResultadoLectura) => void;
}

export interface Excel extends EstadoExcel {
  /** Cantidad de centros del Excel completo (se calcula de "datos"). */
  totalCentros: number;
  cargar: (motivo: MotivoCarga) => Promise<void>;
}

export function useExcel({ config, sesion, avisar, alCargar }: Opciones): Excel {
  const [estado, setEstado] = useState<EstadoExcel>(() => ({
    datos: null,
    archivo: null,
    ultimaConsulta: null,
    cargando: true, // la carga inicial empieza enseguida
    sinDatos: 'cargando',
    // Si Microsoft devolvió un error al iniciar sesión (ej. falta aprobar un permiso), se muestra arriba.
    error: sesion?.errorLogin ? { mensaje: sesion.errorLogin, acciones: [], id: 0 } : null,
  }));

  // Lo último que se recibió (la carga es asíncrona y la auto-actualización corre con un temporizador).
  const actual = useRef({ config, sesion, avisar, alCargar });
  useLayoutEffect(() => {
    actual.current = { config, sesion, avisar, alCargar };
  });
  // Solo lo que el código asíncrono necesita saber AL INSTANTE (el estado de React se actualiza después):
  //  - cargando: para no empezar dos lecturas a la vez (ej. "Actualizar" justo cuando corre la automática);
  //  - eTag: la "versión" del Excel leído, para saber en la auto-actualización si cambió.
  const memoria = useRef<{ cargando: boolean; eTag: string | null }>({ cargando: false, eTag: null });

  // (El tipo se escribe explícito porque la función se usa a sí misma en el botón "Reintentar".)
  const cargar: (motivo: MotivoCarga) => Promise<void> = useCallback(async (motivo: MotivoCarga): Promise<void> => {
    const m = memoria.current;
    if (m.cargando) return;
    m.cargando = true;
    setEstado((e) => ({
      ...e,
      cargando: true,
      sinDatos: !e.datos && motivo !== 'auto' ? (e.sinDatos === 'cargando' ? 'cargando' : 'reintentando') : e.sinDatos,
    }));
    const { config: cfg, sesion: s } = actual.current;
    const obtenerToken = s ? () => s.obtenerToken({ interactivo: motivo !== 'auto' }) : null;
    try {
      // Auto-actualización con el Excel real: si no cambió (mismo eTag), no se descarga.
      if (motivo === 'auto' && cfg.datos.fuente === 'graph' && m.eTag && obtenerToken) {
        const meta = await obtenerMetadatos(cfg.datos, await obtenerToken());
        if (meta.eTag && meta.eTag === m.eTag) {
          const ultimaConsulta = new Date();
          setEstado((e) => ({ ...e, ultimaConsulta, error: null }));
          return;
        }
      }
      const archivo = await descargarExcel(cfg, obtenerToken);
      const datos = leerLibro(archivo.contenido, {
        hoja: cfg.datos.hoja,
        filaEncabezado: cfg.datos.filaEncabezado,
        columnas: cfg.columnas,
        camposObligatorios: cfg.camposObligatorios,
        rellenarHaciaAbajo: cfg.datos.rellenarHaciaAbajo,
        columnasOcultas: cfg.columnasOcultas,
      });
      const info: InfoArchivo = {
        modificado: archivo.modificado,
        nombre: archivo.nombre,
        eTag: archivo.eTag,
        driveId: archivo.driveId || null,
        itemId: archivo.itemId || null,
        origen: archivo.origen || null,
      };
      m.eTag = info.eTag;
      const ultimaConsulta = new Date();
      setEstado((e) => ({ ...e, datos, archivo: info, ultimaConsulta, error: null }));
      actual.current.alCargar(datos);
      if (motivo === 'manual') actual.current.avisar('Datos actualizados');
    } catch (e) {
      console.error('Error al cargar el Excel:', e);
      const reintentar = () => void cargar('manual');
      setEstado((prev) => {
        // Si ya había datos, se siguen mostrando: el aviso dice de qué hora son.
        const aviso = avisoDeError(e, s, reintentar, prev.datos ? prev.ultimaConsulta : null);
        // id nuevo en cada error (aunque el mensaje se repita) para que el lector de pantalla lo vuelva a anunciar.
        const error: AvisoError = { ...aviso, id: (prev.error?.id ?? 0) + 1 };
        return prev.datos ? { ...prev, error } : { ...prev, error, sinDatos: 'error' };
      });
    } finally {
      m.cargando = false;
      setEstado((e) => ({ ...e, cargando: false }));
    }
  }, []);

  // Carga inicial.
  useEffect(() => {
    void cargar('inicial');
  }, [cargar]);

  // Auto-actualización cada N minutos (solo con la pestaña a la vista).
  const minutos = config.autoActualizarMinutos;
  const intervalo = minutos > 0 ? Math.max(3000, minutos * 60 * 1000) : 0;
  useEffect(() => {
    if (!intervalo) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void cargar('auto');
    }, intervalo);
    return () => clearInterval(id);
  }, [intervalo, cargar]);

  // Si la pestaña estuvo escondida mucho tiempo, actualizar al volver.
  const { ultimaConsulta } = estado;
  useEffect(() => {
    if (!intervalo) return;
    const alVolver = () => {
      if (document.visibilityState === 'visible' && ultimaConsulta && Date.now() - ultimaConsulta.getTime() > intervalo) {
        void cargar('auto');
      }
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [intervalo, ultimaConsulta, cargar]);

  // Cantidad de centros del Excel completo: se calcula de los datos (no se guarda aparte).
  const { datos } = estado;
  const totalCentros = useMemo(() => (datos ? agruparPorCentro(datos.filas).length : 0), [datos]);

  return { ...estado, totalCentros, cargar };
}

/**
 * Mensaje y botones del aviso rojo cuando no se pudo leer el Excel.
 * @param datosDeLas  hora de los datos que se siguen mostrando (null si no hay datos)
 */
function avisoDeError(error: unknown, sesion: Sesion | null, reintentar: () => void, datosDeLas: Date | null): Omit<AvisoError, 'id'> {
  const mensaje = error instanceof ErrorDatos ? error.message : 'Ocurrió un error inesperado al leer el Excel. Vuelve a intentar.';
  const acciones: Accion[] = [{ texto: 'Reintentar', accion: reintentar }];
  if (error instanceof ErrorDatos && (error.tipo === 'sesion' || error.tipo === 'consentimiento') && sesion) {
    // Si faltaba aprobar Files.Read.All, al volver a entrar se pide de una vez (no solo el inicio de sesión).
    const todosLosPermisos = error.tipo === 'consentimiento';
    acciones.unshift({
      texto: 'Volver a iniciar sesión',
      accion: () => void sesion.iniciarSesion({ todosLosPermisos }).catch((e: unknown) => console.error(e)),
    });
  }
  if (datosDeLas) {
    return { mensaje: `No se pudo actualizar: ${mensaje} Se siguen mostrando los datos de las ${hora(datosDeLas)}.`, acciones };
  }
  return { mensaje, acciones };
}
