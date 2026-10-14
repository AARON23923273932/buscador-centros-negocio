// Paginación: « ‹ Anterior · Página X de Y · Siguiente › ».
//
// Teclado: si el botón que tenía el foco queda desactivado (ej. "Siguiente" al llegar a la
// última página), el foco pasa al texto "Página X de Y" para que no se pierda.
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { numero } from '../logica/formato.ts';
import type { Pagina } from '../logica/tipos.ts';

interface Props {
  /** null = todavía no hay datos (no se muestran botones). */
  pagina: Pick<Pagina<unknown>, 'pagina' | 'totalPaginas' | 'total'> | null;
  alIrA?: (pagina: number) => void;
  /** El <nav> (lo usa el botón "Saltar a la paginación"). */
  navRef?: RefObject<HTMLElement | null>;
}

export function Paginacion({ pagina: pag, alIrA, navRef }: Props) {
  const propio = useRef<HTMLElement | null>(null);
  const nav = navRef ?? propio;
  /** aria-label del botón pulsado mientras tenía el foco (para cuidar el foco después de cambiar de página). */
  const pulsado = useRef<string | null>(null);

  useLayoutEffect(() => {
    const raiz = nav.current;
    if (!raiz) return;
    const activo = document.activeElement;
    const etiqueta =
      pulsado.current ??
      (activo instanceof HTMLButtonElement && raiz.contains(activo) && activo.disabled ? activo.getAttribute('aria-label') : null);
    pulsado.current = null;
    if (!etiqueta) return;
    const boton = [...raiz.querySelectorAll<HTMLButtonElement>('.btn-pagina')].find((b) => b.getAttribute('aria-label') === etiqueta);
    if (boton && !boton.disabled) {
      if (document.activeElement !== boton) boton.focus();
      return;
    }
    // El botón quedó desactivado (ej. llegaste a la última página): el foco pasa al texto "Página X de Y".
    const actual = raiz.querySelector<HTMLElement>('.pagina-actual');
    if (actual) {
      actual.tabIndex = -1;
      actual.focus();
    }
  });

  const boton = (destino: number, contenido: ReactNode, etiqueta: string, deshabilitado: boolean) => (
    <button
      type="button"
      className="btn btn-pagina"
      data-pagina={destino}
      aria-label={etiqueta}
      disabled={deshabilitado}
      onClick={(ev) => {
        if (document.activeElement === ev.currentTarget) pulsado.current = etiqueta;
        alIrA?.(destino);
      }}
    >
      {contenido}
    </button>
  );

  let botones: ReactNode = null;
  if (pag && pag.total > 0) {
    const primera = pag.pagina <= 1;
    const ultima = pag.pagina >= pag.totalPaginas;
    botones = (
      <>
        {boton(1, '«', 'Primera página', primera)}
        {boton(
          pag.pagina - 1,
          <>
            ‹ <span className="texto-boton">Anterior</span>
          </>,
          'Página anterior',
          primera,
        )}
        <span className="pagina-actual">
          Página {numero(pag.pagina)} de {numero(pag.totalPaginas)}
        </span>
        {boton(
          pag.pagina + 1,
          <>
            <span className="texto-boton">Siguiente</span> ›
          </>,
          'Página siguiente',
          ultima,
        )}
        {boton(pag.totalPaginas, '»', 'Última página', ultima)}
      </>
    );
  }

  return (
    <nav id="paginacion" ref={nav} className="paginacion" aria-label="Paginación de resultados">
      {botones}
    </nav>
  );
}
