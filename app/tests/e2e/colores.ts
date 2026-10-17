import type { BrowserContext, Page } from '@playwright/test';

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

export const TONOS_SUAVES = {
  tinta: 'rgb(26, 35, 51)',
  filaClara: 'rgb(243, 246, 250)',
  grisAzulado: 'rgb(91, 101, 119)',
  bordeSuave: 'rgb(227, 232, 239)',
  bordeCaja: 'rgb(124, 135, 152)',
  pizarra: 'rgb(15, 23, 41)',
  pizarraTarjeta: 'rgb(21, 32, 56)',
  pizarraFila: 'rgb(27, 39, 66)',
  textoOscuro: 'rgb(230, 235, 242)',
  azulSuave: 'rgb(157, 184, 224)',
  anilloOscuro: 'rgb(184, 204, 234)',
  grisOscuro: 'rgb(163, 176, 196)',
  bordeCajaOscuro: 'rgb(107, 120, 148)',
} as const;

export const COLORES_MARCA = [...Object.values(PALETA), ...Object.values(TONOS_SUAVES)];

export const al = (color: string, alfa: number) => `${color} / ${alfa}`;

export interface Sombra {
  color: string;
  medidas: string;
}

declare global {
  interface Window {
    normalizarColor: (valor: string) => string;
    sombrasDe: (valor: string) => Sombra[];
  }
}

export const FUNCIONES_COLOR = String.raw`(?:rgba?|oklab|oklch|lab|lch|hsla?|hwb|color)\([^()]*\)`;

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

export async function prepararColores(destino: Page | BrowserContext) {
  await destino.addInitScript(definirColores, { paleta: COLORES_MARCA, funciones: FUNCIONES_COLOR });
}
