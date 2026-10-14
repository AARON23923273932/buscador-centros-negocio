// useMediaQuery — ¿La pantalla cumple esta condición de CSS? (ej. "(max-width: 719px)" = celular).
// Se actualiza sola si cambia (girar el celular, cambiar el modo oscuro del sistema…).
import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(consulta: string): boolean {
  const suscribir = useCallback(
    (avisar: () => void) => {
      const mq = window.matchMedia?.(consulta);
      mq?.addEventListener?.('change', avisar);
      return () => mq?.removeEventListener?.('change', avisar);
    },
    [consulta],
  );
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia?.(consulta)?.matches ?? false,
    () => false,
  );
}
