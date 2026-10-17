// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App.tsx';
import { Enrutador } from '../../src/componentes/Enrutador.tsx';

const INDEX = readFileSync(resolve(import.meta.dirname, '../../index.html'), 'utf8');

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('index.html: solo el punto de montaje', () => {
  const documento = new DOMParser().parseFromString(INDEX, 'text/html');

  it('#raiz está vacío (sin HTML de la app) y el modo claro/oscuro se aplica antes de pintar', () => {
    const raiz = documento.getElementById('raiz');
    expect(raiz).not.toBeNull();
    expect(raiz?.childElementCount).toBe(0);
    expect(raiz?.textContent?.trim()).toBe('');
    expect(documento.querySelector('head script[src="/tema-inicial.js"]')).not.toBeNull();
  });
});

describe('diseño de las rutas (DisenoApp): lo primero que dibuja React', () => {
  it('cabecera (título, botón de tema), "Saltar al buscador", "Cargando…" en <main> y aviso flotante', () => {
    history.replaceState(null, '', '/');
    const { container } = render(<App />, { wrapper: Enrutador });
    expect(container.querySelector('a.saltar')?.getAttribute('href')).toBe('#buscador');
    expect(container.querySelector('header.cabecera h1#titulo-app')?.textContent).toBe('Buscador de centros de negocio');
    expect(container.querySelector('#btn-tema')?.textContent).toBe('Tema del sistema. Cambiar a tema claro');
    expect(container.querySelector('main#principal #pantalla-carga')?.textContent?.trim()).toBe('Cargando…');
    expect(container.querySelector('#aviso-flotante[role="status"]')).not.toBeNull();
  });
});
