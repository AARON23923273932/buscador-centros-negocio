// @vitest-environment jsdom
// Lo que se ve ANTES de que cargue React (el HTML fijo de index.html, dentro de <div id="raiz">) debe ser
// igual a lo primero que dibuja React (cabecera + "Cargando…"). Si no, la cabecera aparecería de golpe
// y la tarjeta "Cargando…" saltaría hacia abajo al terminar de descargarse el código (más lento en el celular).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App.tsx';
import { Enrutador } from '../../src/componentes/Enrutador.tsx';

const INDEX = readFileSync(resolve(import.meta.dirname, '../../index.html'), 'utf8');

/**
 * "Forma" de un elemento, para comparar sin importar espacios, comentarios ni el orden de los atributos:
 * etiqueta, atributos (ordenados) y contenido, con el texto sin espacios de más.
 */
function forma(nodo: Node): string {
  if (nodo.nodeType === Node.TEXT_NODE) return (nodo.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!(nodo instanceof Element)) return '';
  const atributos = [...nodo.attributes]
    .map((a) => `${a.name}="${a.value}"`)
    .sort()
    .join(' ');
  const hijos = [...nodo.childNodes].map(forma).filter(Boolean).join('');
  return `<${nodo.tagName.toLowerCase()}${atributos ? ` ${atributos}` : ''}>${hijos}</${nodo.tagName.toLowerCase()}>`;
}

const formaDeHijos = (padre: Element) => [...padre.childNodes].map(forma).filter(Boolean);

beforeEach(() => {
  localStorage.clear();
  // config.json "nunca llega": la app se queda en su primera pantalla ("Cargando…").
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('index.html: pantalla antes de que cargue React', () => {
  const raiz = new DOMParser().parseFromString(INDEX, 'text/html').getElementById('raiz');

  it('tiene la cabecera (título, botón ☀️/🌙), "Saltar al buscador" y la tarjeta "Cargando…"', () => {
    expect(raiz).not.toBeNull();
    expect(raiz?.querySelector('a.saltar')?.getAttribute('href')).toBe('#buscador');
    expect(raiz?.querySelector('header.cabecera h1#titulo-app')?.textContent).toBe('Buscador de centros de negocio');
    expect(raiz?.querySelector('#btn-tema')?.getAttribute('aria-label')).toBe('Cambiar a modo oscuro');
    expect(raiz?.querySelector('main#principal #pantalla-carga')?.textContent?.trim()).toBe('Cargando…');
  });

  it('es exactamente lo primero que dibuja React (sin salto visual al reemplazarlo)', () => {
    const { container } = render(<App />, { wrapper: Enrutador });
    expect(container.querySelector('#pantalla-carga')).not.toBeNull();
    expect(formaDeHijos(raiz!)).toEqual(formaDeHijos(container));
  });
});
