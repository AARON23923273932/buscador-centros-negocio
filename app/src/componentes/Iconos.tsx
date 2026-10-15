// Íconos (SVG). Todos llevan aria-hidden: son decoración, el texto del botón dice qué hace.
//
// Alineación (pedido del supervisor, 14/10/2026): todos se dibujan como bloque de 16 px (18 px la lupa, el logo
// de Microsoft y el tema) que no se encoge ("block shrink-0 size-4"), dentro de botones que los centran con
// inline-flex + items-center. Así no "bailan" con la línea del texto. La clase "size-…" también evita que el
// botón de shadcn/ui les cambie el tamaño.
// Los de la cabecera (logo, luna/sol) están también en index.html: si se cambian aquí, cambiarlos allá.
// Colores: heredan el del texto (currentColor), que siempre es un color del tema (paleta de AIC). El logo de
// Microsoft conserva sus 4 colores: es la marca de Microsoft (sus reglas de uso piden no cambiarla).

import type { ReactNode } from 'react';

/** SVG de 24×24 dibujado al tamaño indicado (16 px por defecto). */
function Svg({ children, tamano = 16, clase = '' }: { children: ReactNode; tamano?: number; clase?: string }) {
  const medida = tamano === 18 ? 'size-[18px]' : 'size-4';
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={tamano} height={tamano} className={`block shrink-0 ${medida}${clase ? ` ${clase}` : ''}`}>
      {children}
    </svg>
  );
}

export function IconoLogo() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" className="block">
      <path
        fill="currentColor"
        d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm13-2h2v3h3v2h-3v3h-2v-3h-3v-2h3v-3Z"
      />
    </svg>
  );
}

export function IconoLuna() {
  return (
    <svg className="icono-luna block size-[18px] shrink-0 in-data-[tema-efectivo=oscuro]:hidden" aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path fill="currentColor" d="M21 14.5A8.5 8.5 0 0 1 9.5 3a.5.5 0 0 0-.6-.6A9.5 9.5 0 1 0 21.6 15.1a.5.5 0 0 0-.6-.6Z" />
    </svg>
  );
}

export function IconoSol() {
  return (
    <svg className="icono-sol hidden size-[18px] shrink-0 in-data-[tema-efectivo=oscuro]:block" aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
      />
    </svg>
  );
}

export function IconoMicrosoft() {
  return (
    <svg aria-hidden="true" viewBox="0 0 21 21" width="18" height="18" className="block size-[18px] shrink-0">
      <path fill="#f25022" d="M1 1h9v9H1z" />
      <path fill="#7fba00" d="M11 1h9v9h-9z" />
      <path fill="#00a4ef" d="M1 11h9v9H1z" />
      <path fill="#ffb900" d="M11 11h9v9h-9z" />
    </svg>
  );
}

/** Flechas en círculo de "Actualizar" (giran mientras se descarga el Excel). */
export function IconoActualizar({ girando = false }: { girando?: boolean }) {
  return (
    <Svg clase={girando ? 'animate-spin' : ''}>
      <path
        fill="currentColor"
        d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z"
      />
    </Svg>
  );
}

export function IconoLupa() {
  return (
    <Svg tamano={18} clase="icono-lupa pointer-events-none absolute top-1/2 left-[15px] -mt-[9px] text-muted-foreground">
      <path
        fill="currentColor"
        d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z"
      />
    </Svg>
  );
}

/** "×" del buscador (borrar la búsqueda). */
export function IconoCerrar() {
  return (
    <Svg>
      <path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z" />
    </Svg>
  );
}

export function IconoDescargar() {
  return (
    <Svg>
      <path fill="currentColor" d="M5 20h14v-2H5v2ZM11 2v10.17L7.92 9.08 6.5 10.5 12 16l5.5-5.5-1.42-1.42L13 12.17V2h-2Z" />
    </Svg>
  );
}

/** Embudo del botón "Filtros" (celular). */
export function IconoFiltros() {
  return (
    <Svg>
      <path fill="currentColor" d="M3 5h18v2.2l-7 7.3V20l-4-2v-3.5L3 7.2V5Zm3 2 6 6.25L18 7H6Z" />
    </Svg>
  );
}

export function IconoCopiar() {
  return (
    <Svg>
      <path
        fill="currentColor"
        d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z"
      />
    </Svg>
  );
}

/** Flecha ">" que gira al abrir un centro (vista "Por centro"). */
export function IconoFlecha() {
  return (
    <Svg clase="transition-transform in-aria-expanded:rotate-90">
      <path fill="currentColor" d="M9 6l6 6-6 6-1.4-1.4L12.2 12 7.6 7.4 9 6Z" />
    </Svg>
  );
}

/** Flecha "←" del botón "Volver a la lista". */
export function IconoVolver() {
  return (
    <Svg>
      <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2Z" />
    </Svg>
  );
}

/**
 * Indicador de orden de una columna: sin ordenar (▲▼ tenues: el color del texto del encabezado al 60 %, contraste
 * 5,1:1 en claro y 3,3:1 en oscuro), ascendente (▲) o descendente (▼) en el color del texto del encabezado.
 */
export function IconoOrden({ aria }: { aria: 'none' | 'ascending' | 'descending' }) {
  const arriba = 'M12 4.5 17 10H7l5-5.5Z';
  const abajo = 'M12 19.5 7 14h10l-5 5.5Z';
  return (
    <Svg clase={aria === 'none' ? 'opacity-60' : ''}>
      {aria !== 'descending' && <path fill="currentColor" d={arriba} />}
      {aria !== 'ascending' && <path fill="currentColor" d={abajo} />}
    </Svg>
  );
}

/** Flechas de la paginación: « ‹ › ». */
export function IconoPagina({ tipo }: { tipo: 'primera' | 'anterior' | 'siguiente' | 'ultima' }) {
  const caminos = {
    primera: 'M18.41 16.59 13.82 12l4.59-4.59L17 6l-6 6 6 6 1.41-1.41ZM6 6h2v12H6V6Z',
    anterior: 'M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41Z',
    siguiente: 'M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41Z',
    ultima: 'M5.59 7.41 10.18 12l-4.59 4.59L7 18l6-6-6-6-1.41 1.41ZM16 6h2v12h-2V6Z',
  };
  return (
    <Svg>
      <path fill="currentColor" d={caminos[tipo]} />
    </Svg>
  );
}

/**
 * Ruedita de "Cargando…" (un círculo del color de los bordes con un tramo en el color principal que gira). No es un
 * SVG: es un borde redondo. Está también en index.html (pantalla "Cargando…" antes de que cargue React).
 */
export function IndicadorCarga() {
  return <span className="inline-block size-[22px] shrink-0 animate-spin rounded-full border-3 border-border border-t-primary align-middle" aria-hidden="true" />;
}
