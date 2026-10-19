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

function variables(bloque: string): Map<string, string> {
  const inicio = ESTILOS.indexOf(`${bloque} {`);
  const fin = ESTILOS.indexOf('}', inicio);
  expect(inicio, bloque).toBeGreaterThanOrEqual(0);
  return new Map([...ESTILOS.slice(inicio, fin).matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)].map(([, nombre, valor]) => [nombre!, valor!.trim()]));
}

const colores = (mapa: Map<string, string>) => new Map([...mapa].filter(([, valor]) => valor.startsWith('#')));

function medidasPng(ruta: string): [number, number] {
  const datos = readFileSync(resolve(APP, ruta));
  expect(datos.subarray(1, 4).toString('latin1')).toBe('PNG');
  return [datos.readUInt32BE(16), datos.readUInt32BE(20)];
}

describe('paleta de la marca (solo en las variables del tema)', () => {
  const claro = colores(variables(':root'));
  const oscuro = colores(variables('.dark'));

  it('modo claro: solo colores de la paleta oficial y el naranja del logo', () => {
    const ajenos = [...claro].filter(([, valor]) => ![...PALETA_OFICIAL, ...NARANJA_DEL_LOGO].includes(valor.toLowerCase()));
    expect(ajenos).toEqual([]);
    expect(claro.get('--primary')).toBe('#1e3a6e');
    expect(claro.get('--encabezado-tabla')).toBe('#1e3a6e');
    expect(claro.get('--marca-naranja')).toBe('#f28818');
  });

  it('modo oscuro: define los mismos colores que el claro (ninguno queda con el valor del claro por olvido)', () => {
    expect([...oscuro.keys()].sort()).toEqual([...claro.keys()].sort());
    expect(oscuro.get('--background')).toBe('#0e1726');
    expect(oscuro.get('--foreground')).toBe('#e8eef5');
    expect(oscuro.get('--encabezado-tabla')).toBe('#2c5282');
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
