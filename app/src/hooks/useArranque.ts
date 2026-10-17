import { useEffect, useRef, useState } from 'react';
import type { Sesion } from '../logica/auth.ts';
import { cargarConfig, revisarConfig, type Config, type ConfigSinValidar } from '../logica/config.ts';
import { rutaPublica } from '../logica/rutas.ts';

export type Arranque =
  | { fase: 'cargando'; config: Config | null }
  | { fase: 'sin-config'; error: string }
  | { fase: 'config-invalida'; config: ConfigSinValidar; errores: string[] }
  | { fase: 'sin-login'; config: Config }
  | { fase: 'login'; config: Config; sesion: Sesion }
  | { fase: 'denegado'; config: Config; sesion: Sesion }
  | { fase: 'app'; config: Config; sesion: Sesion | null };

export function useArranque(): Arranque {
  const [arranque, setArranque] = useState<Arranque>({ fase: 'cargando', config: null });
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

  setArranque({ fase: 'cargando', config });
  let sesion: Sesion;
  try {
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
