// useAvisoFlotante — Mensaje corto que aparece abajo unos segundos (ej. "Código CN-0001 copiado").
import { useCallback, useEffect, useRef, useState } from 'react';

const DURACION_MS = 2500;

export interface AvisoFlotante {
  texto: string;
  visible: boolean;
  /**
   * Sube con cada aviso. AvisoFlotante lo usa como "key" del texto: así, aunque el mensaje se repita
   * (ej. "Datos actualizados" dos veces), el texto se vuelve a poner en la página y el lector de
   * pantalla lo anuncia otra vez (React no toca la página si el texto es igual).
   */
  id: number;
}

export type Avisar = (texto: string) => void;

export function useAvisoFlotante(): { aviso: AvisoFlotante; avisar: Avisar } {
  const [aviso, setAviso] = useState<AvisoFlotante>({ texto: '', visible: false, id: 0 });
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const avisar = useCallback<Avisar>((texto) => {
    setAviso((a) => ({ texto, visible: true, id: a.id + 1 }));
    clearTimeout(temporizador.current);
    // Al ocultarse, el texto se queda (solo deja de verse), igual que antes.
    temporizador.current = setTimeout(() => setAviso((a) => ({ ...a, visible: false })), DURACION_MS);
  }, []);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  return { aviso, avisar };
}
