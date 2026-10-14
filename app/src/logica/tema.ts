// =============================================================================
// tema.ts — Reglas del botón ☀️/🌙 para cambiar entre modo claro y oscuro.
// - Si la persona nunca lo tocó, se sigue el modo del sistema (prefers-color-scheme).
// - Al pulsarlo, la elección se guarda en este navegador (localStorage) y se aplica con
//   <html data-tema="claro|oscuro">. public/tema-inicial.js la aplica antes de pintar.
// - <html data-tema-efectivo> indica el modo que se ve ahora (lo usa el CSS del ícono).
// El botón y su estado están en hooks/useTema.ts y componentes/BotonTema.tsx.
// =============================================================================

export const CLAVE_TEMA = 'buscador-cn.tema';

export type Tema = 'claro' | 'oscuro';

export const esTema = (valor: unknown): valor is Tema => valor === 'claro' || valor === 'oscuro';

/** Modo que se ve: la elección guardada, o el del sistema si no hay elección. */
export function temaEfectivo(elegido: unknown, sistemaOscuro: boolean | null | undefined): Tema {
  if (esTema(elegido)) return elegido;
  return sistemaOscuro ? 'oscuro' : 'claro';
}

/** Modo al que lleva el botón. */
export function temaContrario(tema: unknown): Tema {
  return tema === 'oscuro' ? 'claro' : 'oscuro';
}

/** Texto del botón (aria-label y title) según el modo que se ve ahora. */
export function etiquetaBotonTema(efectivo: Tema): string {
  return temaContrario(efectivo) === 'oscuro' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
}

/** Elección guardada en este navegador (null si no hay o no se puede leer). */
export function leerTemaGuardado(): string | null {
  try {
    return localStorage.getItem(CLAVE_TEMA);
  } catch {
    return null;
  }
}

/** Guarda la elección (sin localStorage, el cambio vale hasta recargar). */
export function guardarTema(tema: Tema): void {
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    /* Sin localStorage: el cambio vale hasta recargar. */
  }
}
