import { useCallback, useEffect, useRef, useState } from 'react';

const DURACION_MS = 2500;

export interface AvisoFlotante {
  texto: string;
  visible: boolean;
  id: number;
}

export type Avisar = (texto: string) => void;

export function useAvisoFlotante(): { aviso: AvisoFlotante; avisar: Avisar } {
  const [aviso, setAviso] = useState<AvisoFlotante>({ texto: '', visible: false, id: 0 });
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const avisar = useCallback<Avisar>((texto) => {
    setAviso((a) => ({ texto, visible: true, id: a.id + 1 }));
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso((a) => ({ ...a, visible: false })), DURACION_MS);
  }, []);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  return { aviso, avisar };
}
