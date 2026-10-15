// Colores en las pruebas en navegador: la paleta de la guía de AIC y cómo leer un color calculado por el navegador.
//
// Desde el pedido de Gustavo del 15/10/2026 (componentes de shadcn/ui "naturales", sin cambios), los componentes usan
// transparencias de los colores del tema (ej. hover:bg-primary/80, ring-ring/50) y sombras neutras. Tailwind CSS v4
// las escribe con color-mix() y el navegador las devuelve en otras notaciones (ej. "oklab(0.35 -0.01 -0.08 / 0.8)"),
// no siempre en rgb(). normalizarColor() (dentro de la página) convierte CUALQUIER notación a sRGB dibujando el color
// opaco en un lienzo de 1×1 px, y separa la transparencia:
//   "rgb(30, 58, 110)"          color opaco
//   "rgb(30, 58, 110) / 0.8"    el mismo color al 80 %
//   "transparente"              alfa 0 (no se ve)
// Las diferencias de redondeo al pasar de oklab a sRGB (±2 por canal) se corrigen al color de la paleta.
import type { BrowserContext, Page } from '@playwright/test';

/** Los 9 colores de la guía de AIC, como los devuelve getComputedStyle. */
export const PALETA = {
  primaryBlue: 'rgb(30, 58, 110)',
  darkBlue: 'rgb(44, 82, 130)',
  mediumBlue: 'rgb(59, 107, 170)',
  lightBlue: 'rgb(232, 238, 245)',
  lightGray: 'rgb(245, 245, 245)',
  black: 'rgb(0, 0, 0)',
  white: 'rgb(255, 255, 255)',
  gray: 'rgb(102, 102, 102)',
  borderGray: 'rgb(204, 204, 204)',
} as const;

/** Un color de la paleta con transparencia, como lo devuelve normalizarColor(): ej. al(PALETA.lightGray, 0.5). */
export const al = (color: string, alfa: number) => `${color} / ${alfa}`;

/** Una sombra de box-shadow: su color (normalizado) y sus medidas (ej. "0px 0px 0px 3px"). */
export interface Sombra {
  color: string;
  medidas: string;
}

declare global {
  interface Window {
    /** Cualquier color de CSS → "rgb(r, g, b)", "rgb(r, g, b) / alfa" o "transparente" (ver arriba). */
    normalizarColor: (valor: string) => string;
    /** Las sombras visibles de un box-shadow calculado (sin las transparentes que agrega Tailwind). */
    sombrasDe: (valor: string) => Sombra[];
  }
}

/** Todas las funciones de color de CSS que puede devolver getComputedStyle. */
export const FUNCIONES_COLOR = String.raw`(?:rgba?|oklab|oklch|lab|lch|hsla?|hwb|color)\([^()]*\)`;

/** Se ejecuta en la página (antes de cargarla): define window.normalizarColor y window.sombrasDe. */
function definirColores({ paleta, funciones }: { paleta: string[]; funciones: string }) {
  const lienzo = document.createElement('canvas');
  lienzo.width = 1;
  lienzo.height = 1;
  const ctx = lienzo.getContext('2d', { willReadFrequently: true })!;
  const canales = (c: string) => (/rgb\((\d+), (\d+), (\d+)\)/.exec(c) ?? []).slice(1).map(Number);
  const paletaRgb = paleta.map((p) => ({ p, rgb: canales(p) }));
  const alfaDe = (t: string) => (t.endsWith('%') ? parseFloat(t) / 100 : parseFloat(t));

  window.normalizarColor = (valor: string) => {
    let texto = valor.trim();
    let alfa = 1;
    const viejo = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+%?)\s*)?\)$/.exec(texto);
    if (viejo) {
      if (viejo[4] !== undefined) alfa = alfaDe(viejo[4]);
      texto = `rgb(${viejo[1]}, ${viejo[2]}, ${viejo[3]})`;
    } else {
      const barra = /\/\s*([\d.]+%?)\s*\)$/.exec(texto);
      if (barra) {
        alfa = alfaDe(barra[1]!);
        texto = texto.replace(/\s*\/\s*[\d.]+%?\s*\)$/, ')');
      }
    }
    if (alfa <= 0.001) return 'transparente';
    if (!CSS.supports('color', texto)) return `desconocido(${valor})`;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = texto;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    let rgb = `rgb(${r}, ${g}, ${b})`;
    for (const { p, rgb: [pr, pg, pb] } of paletaRgb) {
      if (Math.abs(pr! - r!) <= 2 && Math.abs(pg! - g!) <= 2 && Math.abs(pb! - b!) <= 2) rgb = p;
    }
    return alfa >= 0.995 ? rgb : `${rgb} / ${Math.round(alfa * 100) / 100}`;
  };

  window.sombrasDe = (valor: string) => {
    if (!valor || valor === 'none') return [];
    // Separa las sombras por las comas de afuera (los colores también llevan comas).
    const partes: string[] = [];
    let nivel = 0;
    let actual = '';
    for (const c of valor) {
      if (c === '(') nivel++;
      if (c === ')') nivel--;
      if (c === ',' && nivel === 0) {
        partes.push(actual.trim());
        actual = '';
      } else actual += c;
    }
    if (actual.trim()) partes.push(actual.trim());
    return partes
      .map((parte) => {
        const color = new RegExp(funciones).exec(parte)?.[0] ?? '';
        return { color: color ? window.normalizarColor(color) : 'transparente', medidas: parte.replace(color, '').replace(/\s+/g, ' ').trim() };
      })
      .filter((s) => s.color !== 'transparente');
  };
}

/** Prepara la página (o todas las de un contexto) para leer colores con normalizarColor() y sombrasDe(). */
export async function prepararColores(destino: Page | BrowserContext) {
  await destino.addInitScript(definirColores, { paleta: Object.values(PALETA), funciones: FUNCIONES_COLOR });
}
