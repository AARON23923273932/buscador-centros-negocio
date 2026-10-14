// useAvisoFlotante — Mensaje corto que aparece abajo unos segundos (ej. "Código CN-0001 copiado").
import { useCallback, useEffect, useRef, useState } from 'react';

const DURACION_MS = 2500;

export interface AvisoFlotante {
  texto: string;
  visible: boolean;
}

export type Avisar = (texto: string) => void;

export function useAvisoFlotante(): { aviso: AvisoFlotante; avisar: Avisar } {
  const [aviso, setAviso] = useState<AvisoFlotante>({ texto: '', visible: false });
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const avisar = useCallback<Avisar>((texto) => {
    setAviso({ texto, visible: true });
    clearTimeout(temporizador.current);
    // Al ocultarse, el texto se queda (solo deja de verse), igual que antes.
    temporizador.current = setTimeout(() => setAviso((a) => ({ ...a, visible: false })), DURACION_MS);
  }, []);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  return { aviso, avisar };
}
