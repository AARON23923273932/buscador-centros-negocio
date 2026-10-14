// =============================================================================
// useExcel — Descarga y lee el Excel, y lo vuelve a revisar solo cada N minutos.
//
// cargar(motivo): 'inicial' (al abrir) | 'manual' (botón Actualizar) | 'auto' (cada N minutos).
// En "auto" con el Excel real, primero pregunta a Microsoft si el Excel cambió (algo muy
// liviano) y solo lo descarga de nuevo si cambió.
// =============================================================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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
}

export interface EstadoExcel {
  datos: ResultadoLectura | null;
  archivo: InfoArchivo | null;
  /** Última vez que se revisó el Excel. */
  ultimaConsulta: Date | null;
  /** Cantidad de centros del Excel completo. */
  totalCentros: number;
  cargando: boolean;
  /** Mientras no hay datos, la tabla muestra "Cargando…" o "No hay datos para mostrar". */
  sinDatos: 'cargando' | 'error';
  /** La última lectura falló y no hay datos que mostrar ("No se pudieron cargar los datos."). */
  falloSinDatos: boolean;
  error: AvisoError | null;
}

interface Opciones {
  config: Config;
  sesion: Sesion | null;
  avisar: Avisar;
  /** Se llama cada vez que se leyó el Excel (para ajustar los filtros a sus columnas). */
  alCargar: (datos: ResultadoLectura) => void;
}

export function useExcel({ config, sesion, avisar, alCargar }: Opciones): EstadoExcel & { cargar: (motivo: MotivoCarga) => Promise<void> } {
  const [estado, setEstado] = useState<EstadoExcel>(() => ({
    datos: null,
    archivo: null,
    ultimaConsulta: null,
    totalCentros: 0,
    cargando: true, // la carga inicial empieza enseguida
    sinDatos: 'cargando',
    falloSinDatos: false,
    // Si Microsoft devolvió un error al iniciar sesión (ej. falta aprobar un permiso), se muestra arriba.
    error: sesion?.errorLogin ? { mensaje: sesion.errorLogin, acciones: [] } : null,
  }));

  // Lo último que se recibió (la carga es asíncrona y la auto-actualización corre con un temporizador).
  const actual = useRef({ config, sesion, avisar, alCargar });
  useLayoutEffect(() => {
    actual.current = { config, sesion, avisar, alCargar };
  });
  const memoria = useRef<{ cargando: boolean; archivo: InfoArchivo | null; hayDatos: boolean; ultimaConsulta: Date | null }>({
    cargando: false,
    archivo: null,
    hayDatos: false,
    ultimaConsulta: null,
  });

  // (El tipo se escribe explícito porque la función se usa a sí misma en el botón "Reintentar".)
  const cargar: (motivo: MotivoCarga) => Promise<void> = useCallback(async (motivo: MotivoCarga): Promise<void> => {
    const m = memoria.current;
    if (m.cargando) return;
    m.cargando = true;
    setEstado((e) => ({ ...e, cargando: true, sinDatos: !e.datos && motivo !== 'auto' ? 'cargando' : e.sinDatos }));
    const { config: cfg, sesion: s } = actual.current;
    const obtenerToken = s ? () => s.obtenerToken({ interactivo: motivo !== 'auto' }) : null;
    try {
      // Auto-actualización con el Excel real: si no cambió (mismo eTag), no se descarga.
      if (motivo === 'auto' && cfg.datos.fuente === 'graph' && m.archivo?.eTag && obtenerToken) {
        const meta = await obtenerMetadatos(cfg.datos, await obtenerToken());
        if (meta.eTag && meta.eTag === m.archivo.eTag) {
          const ultimaConsulta = new Date();
          m.ultimaConsulta = ultimaConsulta;
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
      const ultimaConsulta = new Date();
      Object.assign(m, { archivo: info, hayDatos: true, ultimaConsulta });
      setEstado((e) => ({
        ...e,
        datos,
        archivo: info,
        ultimaConsulta,
        totalCentros: agruparPorCentro(datos.filas).length,
        falloSinDatos: false,
        error: null,
      }));
      actual.current.alCargar(datos);
      if (motivo === 'manual') actual.current.avisar('Datos actualizados');
    } catch (e) {
      console.error('Error al cargar el Excel:', e);
      const error = avisoDeError(e, s, () => void cargar('manual'), m.hayDatos ? m.ultimaConsulta : null);
      setEstado((prev) => (prev.datos ? { ...prev, error } : { ...prev, error, sinDatos: 'error', falloSinDatos: true }));
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
  const minutos = Number(config.autoActualizarMinutos);
  useEffect(() => {
    if (!(minutos > 0)) return;
    const intervalo = Math.max(3000, minutos * 60 * 1000);
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void cargar('auto');
    }, intervalo);
    // Si la pestaña estuvo escondida mucho tiempo, actualizar al volver.
    const alVolver = () => {
      const u = memoria.current.ultimaConsulta;
      if (document.visibilityState === 'visible' && u && Date.now() - u.getTime() > intervalo) void cargar('auto');
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [minutos, cargar]);

  return { ...estado, cargar };
}

/**
 * Mensaje y botones del aviso rojo cuando no se pudo leer el Excel.
 * @param datosDeLas  hora de los datos que se siguen mostrando (null si no hay datos)
 */
function avisoDeError(error: unknown, sesion: Sesion | null, reintentar: () => void, datosDeLas: Date | null): AvisoError {
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
