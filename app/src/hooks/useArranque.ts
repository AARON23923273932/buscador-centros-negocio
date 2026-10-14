// =============================================================================
// useArranque — Lo que pasa al abrir la página:
//
//   config.json ──► ¿está bien? ──► modo demo: a la app
//                               └─► modo microsoft: MSAL ──► ¿hay sesión? ¿de la empresa?
//
// Devuelve en qué "fase" está el arranque; App.tsx muestra la pantalla de cada fase.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import type { Sesion } from '../logica/auth.ts';
import { cargarConfig, revisarConfig, type Config, type ConfigSinValidar } from '../logica/config.ts';
import { rutaPublica } from '../logica/rutas.ts';

export type Arranque =
  /** Leyendo config.json o preparando el inicio de sesión. */
  | { fase: 'cargando'; config: Config | null }
  /** No se pudo leer config.json. */
  | { fase: 'sin-config'; error: string }
  /** config.json tiene datos que faltan o están mal escritos (por eso la configuración queda sin validar). */
  | { fase: 'config-invalida'; config: ConfigSinValidar; errores: string[] }
  /** No se pudo preparar MSAL (ej. sin internet). */
  | { fase: 'sin-login'; config: Config }
  /** Hay que iniciar sesión con Microsoft. */
  | { fase: 'login'; config: Config; sesion: Sesion }
  /** Entró con una cuenta que no es de la empresa. */
  | { fase: 'denegado'; config: Config; sesion: Sesion }
  /** Todo listo: la aplicación (sesion = null en modo demo). */
  | { fase: 'app'; config: Config; sesion: Sesion | null };

export function useArranque(): Arranque {
  const [arranque, setArranque] = useState<Arranque>({ fase: 'cargando', config: null });
  // React (en modo estricto, solo en desarrollo) ejecuta los efectos dos veces: esto evita arrancar dos veces
  // (MSAL no debe procesar dos veces la vuelta de Microsoft).
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    void arrancar(setArranque);
  }, []);

  return arranque;
}

async function arrancar(setArranque: (a: Arranque) => void): Promise<void> {
  let sinValidar: ConfigSinValidar;
  try {
    // Desde la carpeta de la app (no desde la ruta actual: en /centros/A2338PY01 sería /centros/config.json).
    sinValidar = await cargarConfig(rutaPublica('config.json'));
  } catch (e) {
    setArranque({ fase: 'sin-config', error: e instanceof Error ? e.message : String(e) });
    return;
  }

  const revision = revisarConfig(sinValidar);
  if (!revision.valida) {
    setArranque({ fase: 'config-invalida', config: sinValidar, errores: revision.errores });
    return;
  }
  const { config } = revision;
  if (config.modo !== 'microsoft') {
    setArranque({ fase: 'app', config, sesion: null });
    return;
  }

  // Ya se puede mostrar el título de config.json mientras se prepara el inicio de sesión.
  setArranque({ fase: 'cargando', config });
  let sesion: Sesion;
  try {
    // Solo en modo "microsoft" se descarga MSAL (en modo demo no hace falta).
    const { iniciarMicrosoft } = await import('../logica/auth.ts');
    sesion = await iniciarMicrosoft(config.microsoft);
  } catch (e) {
    console.error(e);
    setArranque({ fase: 'sin-login', config });
    return;
  }

  if (sesion.estado === 'sin-sesion') setArranque({ fase: 'login', config, sesion });
  else if (sesion.estado === 'denegado') setArranque({ fase: 'denegado', config, sesion });
  else setArranque({ fase: 'app', config, sesion });
}
