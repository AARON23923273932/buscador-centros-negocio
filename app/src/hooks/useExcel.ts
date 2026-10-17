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

export interface InfoArchivo {
  modificado: Date | null;
  nombre: string;
  eTag: string | null;
  driveId: string | null;
  itemId: string | null;
  origen: OrigenExcel | null;
}

export interface AvisoError {
  mensaje: string;
  acciones: Accion[];
  id: number;
}

export interface EstadoExcel {
  datos: ResultadoLectura | null;
  archivo: InfoArchivo | null;
  ultimaConsulta: Date | null;
  cargando: boolean;
  sinDatos: 'cargando' | 'error' | 'reintentando';
  error: AvisoError | null;
}

interface Opciones {
  config: Config;
  sesion: Sesion | null;
  avisar: Avisar;
  alCargar: (datos: ResultadoLectura) => void;
}

export interface Excel extends EstadoExcel {
  totalCentros: number;
  cargar: (motivo: MotivoCarga) => Promise<void>;
}

export function useExcel({ config, sesion, avisar, alCargar }: Opciones): Excel {
  const [estado, setEstado] = useState<EstadoExcel>(() => ({
    datos: null,
    archivo: null,
    ultimaConsulta: null,
    cargando: true,
    sinDatos: 'cargando',
    error: sesion?.errorLogin ? { mensaje: sesion.errorLogin, acciones: [], id: 0 } : null,
  }));

  const actual = useRef({ config, sesion, avisar, alCargar });
  useLayoutEffect(() => {
    actual.current = { config, sesion, avisar, alCargar };
  });
  const memoria = useRef<{ cargando: boolean; eTag: string | null }>({ cargando: false, eTag: null });

  const cargar = useCallback(async function cargar(motivo: MotivoCarga): Promise<void> {
    const m = memoria.current;
    if (m.cargando) return;
    m.cargando = true;
    setEstado((e) => {
      const sinDatos = !e.datos && motivo !== 'auto' ? (e.sinDatos === 'cargando' ? 'cargando' : 'reintentando') : e.sinDatos;
      return e.cargando && e.sinDatos === sinDatos ? e : { ...e, cargando: true, sinDatos };
    });
    const { config: cfg, sesion: s } = actual.current;
    const obtenerToken = s ? () => s.obtenerToken({ interactivo: motivo !== 'auto' }) : null;
    try {
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
        const aviso = avisoDeError(e, s, reintentar, prev.datos ? prev.ultimaConsulta : null);
        const error: AvisoError = { ...aviso, id: (prev.error?.id ?? 0) + 1 };
        return prev.datos ? { ...prev, error } : { ...prev, error, sinDatos: 'error' };
      });
    } finally {
      m.cargando = false;
      setEstado((e) => ({ ...e, cargando: false }));
    }
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    void cargar('inicial');
  }, [cargar]);

  const minutos = config.autoActualizarMinutos;
  const intervalo = minutos > 0 ? Math.max(3000, minutos * 60 * 1000) : 0;
  useEffect(() => {
    if (!intervalo) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void cargar('auto');
    }, intervalo);
    return () => clearInterval(id);
  }, [intervalo, cargar]);

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

  const { datos } = estado;
  const totalCentros = useMemo(() => (datos ? agruparPorCentro(datos.filas).length : 0), [datos]);

  return { ...estado, totalCentros, cargar };
}

function avisoDeError(error: unknown, sesion: Sesion | null, reintentar: () => void, datosDeLas: Date | null): Omit<AvisoError, 'id'> {
  const mensaje = error instanceof ErrorDatos ? error.message : 'Ocurrió un error inesperado al leer el Excel. Vuelve a intentar.';
  const acciones: Accion[] = [{ texto: 'Reintentar', accion: reintentar }];
  if (error instanceof ErrorDatos && (error.tipo === 'sesion' || error.tipo === 'consentimiento') && sesion) {
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
