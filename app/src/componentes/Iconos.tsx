import type { ReactNode } from 'react';

function Svg({ children, tamano = 16, clase = '' }: { children: ReactNode; tamano?: number; clase?: string }) {
  const medida = tamano === 18 ? 'size-[18px]' : 'size-4';
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={tamano} height={tamano} className={`block shrink-0 ${medida}${clase ? ` ${clase}` : ''}`}>
      {children}
    </svg>
  );
}

export function LogoAic({ className }: { className?: string }) {
  return (
    <>
      <img src="/marca/aic-logo-claro.png" alt="AIC" width={305} height={160} className={`logo-aic block w-auto dark:hidden ${className ?? ''}`} />
      <img src="/marca/aic-logo-oscuro.png" alt="AIC" width={305} height={160} className={`logo-aic hidden w-auto dark:block ${className ?? ''}`} />
    </>
  );
}

export function IconoMicrosoft() {
  return (
    <svg aria-hidden="true" viewBox="-1.5 -1.5 24 24" width="20" height="20" className="block size-5 shrink-0">
      <rect x="-0.9" y="-0.9" width="22.8" height="22.8" rx="2.6" fill="#ffffff" stroke="#000000" strokeWidth="1.2" className="hidden dark:block" />
      <path fill="#f25022" d="M1 1h9v9H1z" />
      <path fill="#7fba00" d="M11 1h9v9h-9z" />
      <path fill="#00a4ef" d="M1 11h9v9H1z" />
      <path fill="#ffb900" d="M11 11h9v9h-9z" />
    </svg>
  );
}

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

export function IconoFlecha() {
  return (
    <Svg clase="transition-transform in-aria-expanded:rotate-90">
      <path fill="currentColor" d="M9 6l6 6-6 6-1.4-1.4L12.2 12 7.6 7.4 9 6Z" />
    </Svg>
  );
}

export function IconoVolver() {
  return (
    <Svg>
      <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2Z" />
    </Svg>
  );
}

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

export function IndicadorCarga() {
  return <span className="inline-block size-[22px] shrink-0 animate-spin rounded-full border-3 border-border border-t-primary align-middle" aria-hidden="true" />;
}
