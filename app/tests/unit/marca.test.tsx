import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LogoAic } from '../../src/componentes/Iconos.tsx';
import { CLASE_ENCABEZADO, CLASE_FILA, CLASE_FILA_ALTERNA, claseFila } from '../../src/logica/tabla.ts';

const APP = resolve(import.meta.dirname, '../..');
const leer = (ruta: string) => readFileSync(resolve(APP, ruta), 'utf8');
const ESTILOS = leer('src/estilos.css');

const PALETA_OFICIAL = ['#1e3a6e', '#2c5282', '#3b6baa', '#e8eef5', '#f5f5f5', '#000000', '#ffffff', '#666666', '#cccccc'];
const NARANJA_DEL_LOGO = ['#f28818', '#ffe3bf'];
const TONOS_DEL_MODO_OSCURO = ['#0e1726', '#16233a', '#1c2b47', '#24395e', '#33476b', '#7086ac', '#a8b6cc', '#8fb0e0', '#bdd0ec', '#5a3a0e'];
const COLORES_CLARO = [...PALETA_OFICIAL, ...NARANJA_DEL_LOGO];
const COLORES_OSCURO = [...COLORES_CLARO, ...TONOS_DEL_MODO_OSCURO];
const NO_SON_COLORES = ['--radius', '--ancho-contenido', '--margen-lateral'];
const PARECE_COLOR = /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i;

function variables(bloque: string, css = ESTILOS): Map<string, string> {
  const inicio = css.indexOf(`${bloque} {`);
  const fin = css.indexOf('}', inicio);
  expect(inicio, bloque).toBeGreaterThanOrEqual(0);
  return new Map([...css.slice(inicio, fin).matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map(([, nombre, valor]) => [nombre!, valor!.trim()]));
}

const coloresDelTema = (css: string) => [...css.matchAll(/--color-([\w-]+): var\(--\1\);/g)].map(([, nombre]) => `--${nombre}`);

function revisarBloque(css: string, bloque: string, permitidos: readonly string[]) {
  const deColor = coloresDelTema(css);
  const mapa = variables(bloque, css);
  return {
    colores: new Map([...mapa].filter(([nombre]) => deColor.includes(nombre))),
    ajenos: [...mapa].filter(([nombre, valor]) => deColor.includes(nombre) && !permitidos.includes(valor.toLowerCase())).map(([nombre]) => nombre),
    sinClasificar: [...mapa].filter(([nombre]) => !deColor.includes(nombre) && !NO_SON_COLORES.includes(nombre)).map(([nombre]) => nombre),
    coloresEscondidos: [...mapa].filter(([nombre, valor]) => NO_SON_COLORES.includes(nombre) && PARECE_COLOR.test(valor)).map(([nombre]) => nombre),
    faltan: deColor.filter((nombre) => !mapa.has(nombre)),
  };
}

function medidasPng(ruta: string): [number, number] {
  const datos = readFileSync(resolve(APP, ruta));
  expect(datos.subarray(1, 4).toString('latin1')).toBe('PNG');
  return [datos.readUInt32BE(16), datos.readUInt32BE(20)];
}

describe('paleta de la marca (solo en las variables del tema)', () => {
  const claro = revisarBloque(ESTILOS, ':root', COLORES_CLARO);
  const oscuro = revisarBloque(ESTILOS, '.dark', COLORES_OSCURO);

  it('modo claro: todos los colores del tema son de la paleta oficial o el naranja del logo (en cualquier notación: rgb(), oklch(), un nombre…)', () => {
    expect(claro).toMatchObject({ ajenos: [], sinClasificar: [], coloresEscondidos: [], faltan: [] });
    expect(claro.colores.size).toBe(coloresDelTema(ESTILOS).length);
    expect(claro.colores.get('--primary')).toBe('#1e3a6e');
    expect(claro.colores.get('--encabezado-tabla')).toBe('#1e3a6e');
    expect(claro.colores.get('--marca-naranja')).toBe('#f28818');
  });

  it('modo oscuro: define los mismos colores que el claro (ninguno queda con el valor del claro por olvido), solo con la paleta, el naranja y sus tonos propios', () => {
    expect(oscuro).toMatchObject({ ajenos: [], sinClasificar: [], coloresEscondidos: [], faltan: [] });
    expect([...oscuro.colores.keys()].sort()).toEqual([...claro.colores.keys()].sort());
    expect(oscuro.colores.get('--background')).toBe('#0e1726');
    expect(oscuro.colores.get('--foreground')).toBe('#e8eef5');
    expect(oscuro.colores.get('--encabezado-tabla')).toBe('#2c5282');
    expect(oscuro.colores.get('--input')).toBe('#7086ac');
    expect(oscuro.colores.get('--ring')).toBe('#bdd0ec');
  });

  it('cada tono propio del modo oscuro se usa en el bloque oscuro (la lista de permitidos no guarda colores viejos)', () => {
    const usados = new Set(oscuro.colores.values());
    expect(TONOS_DEL_MODO_OSCURO.filter((tono) => !usados.has(tono))).toEqual([]);
  });

  it('la revisión detecta un color fuera de la lista en cualquier notación, una variable nueva sin clasificar y un color escondido en una medida', () => {
    const css = [
      '@theme inline {',
      '  --color-primary: var(--primary);',
      '  --color-border: var(--border);',
      '  --color-ring: var(--ring);',
      '  --color-accent: var(--accent);',
      '  --color-muted: var(--muted);',
      '  --color-card: var(--card);',
      '}',
      ':root {',
      '  --primary: oklch(0.38 0.1 262);',
      '  --border: gray;',
      '  --ring: rgb(59 107 170);',
      '  --accent: #16233a;',
      '  --muted: #F5F5F5;',
      '  --radius: 0.75rem;',
      '  --margen-lateral: color-mix(in oklab, red 10%, transparent);',
      '  --nueva: 3px;',
      '}',
    ].join('\n');
    expect(revisarBloque(css, ':root', COLORES_CLARO)).toMatchObject({
      ajenos: ['--primary', '--border', '--ring', '--accent'],
      sinClasificar: ['--nueva'],
      coloresEscondidos: ['--margen-lateral'],
      faltan: ['--card'],
    });
  });

  it('los colores nuevos de la marca tienen su utilidad de Tailwind (bg-…, text-…)', () => {
    for (const nombre of ['marca-naranja', 'marca-naranja-foreground', 'encabezado-tabla', 'encabezado-tabla-foreground', 'resaltado', 'resaltado-foreground']) {
      expect(ESTILOS).toContain(`--color-${nombre}: var(--${nombre});`);
    }
    expect(ESTILOS).toMatch(/mark \{\s*@apply [^;]*bg-resaltado [^;]*text-resaltado-foreground;/);
  });
});

describe('tablas con los colores de la marca', () => {
  it('encabezado con su color propio (Primary Blue en claro, Dark Blue en oscuro) y texto blanco', () => {
    expect(CLASE_ENCABEZADO).toContain('bg-encabezado-tabla');
    expect(CLASE_ENCABEZADO).toContain('text-encabezado-tabla-foreground');
  });

  it('todas las filas toman el acento con el mouse; las alternas, además, su fondo', () => {
    expect(CLASE_FILA).toBe('hover:bg-accent');
    expect(claseFila(0)).toBe(CLASE_FILA);
    expect(claseFila(1)).toBe(`${CLASE_FILA} ${CLASE_FILA_ALTERNA}`);
    expect(claseFila(2)).toBe(CLASE_FILA);
  });
});

describe('logo y favicon de AIC', () => {
  it('LogoAic usa los PNG de public/marca con sus medidas reales y alt "AIC" (uno para cada modo)', () => {
    const html = renderToStaticMarkup(<LogoAic className="h-10" />);
    const imagenes = [...html.matchAll(/<img [^>]*>/g)].map(([img]) => ({
      src: /src="([^"]+)"/.exec(img)?.[1],
      alt: /alt="([^"]*)"/.exec(img)?.[1],
      medidas: [Number(/width="(\d+)"/.exec(img)?.[1]), Number(/height="(\d+)"/.exec(img)?.[1])],
      clase: /class="([^"]+)"/.exec(img)?.[1] ?? '',
    }));
    expect(imagenes.map((i) => i.src)).toEqual(['/marca/aic-logo-claro.png', '/marca/aic-logo-oscuro.png']);
    for (const img of imagenes) {
      expect(img.alt).toBe('AIC');
      expect(img.medidas).toEqual(medidasPng(`public${img.src}`));
      expect(img.clase).toContain('h-10');
    }
    expect(imagenes[0]!.clase).toContain('dark:hidden');
    expect(imagenes[1]!.clase).toMatch(/\bhidden\b.*\bdark:block\b/);
  });

  it('los dos logos tienen la misma forma (mismo recorte) y alcanzan para pantallas 4x a 40 px de alto', () => {
    expect(medidasPng('public/marca/aic-logo-claro.png')).toEqual(medidasPng('public/marca/aic-logo-oscuro.png'));
    expect(medidasPng('public/marca/aic-logo-claro.png')[1]).toBeGreaterThanOrEqual(160);
  });

  it('favicon (SVG) e ícono para el celular (PNG de 180 px) enlazados en index.html', () => {
    const index = leer('index.html');
    expect(index).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />');
    expect(index).toContain('<link rel="apple-touch-icon" href="/marca/aic-icono-180.png" />');
    expect(medidasPng('public/marca/aic-icono-180.png')).toEqual([180, 180]);
    expect(leer('public/favicon.svg')).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 32 32">/);
  });
});
