// =============================================================================
// useTema — Estado del botón ☀️/🌙 (modo claro / oscuro).
// - Sin elección guardada se sigue el modo del sistema (y se actualiza si el sistema cambia).
// - La elección se guarda en este navegador y se escribe en <html data-tema="…">
//   (public/tema-inicial.js la aplica antes de pintar para que no "parpadee").
// - <html data-tema-efectivo="…"> = el modo que se ve ahora (lo usa el CSS del ícono).
// =============================================================================

import { useCallback, useLayoutEffect, useState } from 'react';
import { esTema, etiquetaBotonTema, guardarTema, leerTemaGuardado, temaContrario, temaEfectivo, type Tema } from '../logica/tema.ts';
import { useMediaQuery } from './useMediaQuery.ts';

export interface EstadoTema {
  /** Modo que se ve ahora. */
  efectivo: Tema;
  /** Texto del botón: "Cambiar a modo oscuro" / "Cambiar a modo claro". */
  etiqueta: string;
  /** Cambia al modo contrario y lo recuerda. */
  alternar: () => void;
}

export function useTema(): EstadoTema {
  const [elegido, setElegido] = useState<Tema | null>(() => {
    const guardado = leerTemaGuardado();
    if (esTema(guardado)) return guardado;
    // Si tema-inicial.js ya puso un tema (o lo puso otra pestaña), se respeta.
    const actual = document.documentElement.getAttribute('data-tema');
    return esTema(actual) ? actual : null;
  });
  const sistemaOscuro = useMediaQuery('(prefers-color-scheme: dark)');
  const efectivo = temaEfectivo(elegido, sistemaOscuro);

  // useLayoutEffect: se aplica antes de que el navegador pinte (sin parpadeo).
  useLayoutEffect(() => {
    const raiz = document.documentElement;
    if (elegido) raiz.setAttribute('data-tema', elegido);
    raiz.setAttribute('data-tema-efectivo', efectivo);
  }, [elegido, efectivo]);

  const alternar = useCallback(() => {
    const nuevo = temaContrario(efectivo);
    setElegido(nuevo);
    guardarTema(nuevo);
  }, [efectivo]);

  return { efectivo, etiqueta: etiquetaBotonTema(efectivo), alternar };
}
