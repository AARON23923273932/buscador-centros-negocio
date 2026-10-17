import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP = resolve(import.meta.dirname, '../..');
const leer = (ruta: string) => readFileSync(resolve(APP, ruta), 'utf8');

describe('publicación con rutas', () => {
  it('Netlify (public/_redirects): toda ruta sin archivo responde index.html con código 200, sin tapar archivos', () => {
    const reglas = leer('public/_redirects')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    expect(reglas).toEqual(['/*    /index.html    200']);
    expect(reglas.join(' ')).not.toContain('!');
  });

  it('Azure Static Web Apps: navigationFallback a index.html, salvo archivos (assets, config.json, redirect.html…)', () => {
    const config = JSON.parse(leer('public/staticwebapp.config.json')) as { navigationFallback: { rewrite: string; exclude: string[] } };
    expect(config.navigationFallback.rewrite).toBe('/index.html');
    expect(config.navigationFallback.exclude).toEqual(expect.arrayContaining(['/assets/*', '/redirect.html', '/config.json']));
  });

  it('Azure Static Web Apps: index.html sin caché larga también en /ordenes y /centros/… (cabecera global)', () => {
    type Regla = { route: string; headers?: Record<string, string> };
    const config = JSON.parse(leer('public/staticwebapp.config.json')) as { routes: Regla[]; globalHeaders: Record<string, string> };
    expect(config.globalHeaders['Cache-Control']).toBe('no-cache');
    const cabecera = (ruta: string) => config.routes.find((r) => r.route === ruta)?.headers?.['Cache-Control'];
    expect(cabecera('/assets/*')).toBe('public, max-age=31536000, immutable');
    expect(cabecera('/config.json')).toContain('no-store');
    expect(config.routes.some((r) => r.route === '/index.html')).toBe(false);
  });

  it('la app se publica en la raíz (base "/") y index.html pide sus archivos desde "/"', () => {
    expect(leer('vite.config.ts')).toMatch(/^\s*base: '\/',$/m);
    const index = leer('index.html');
    expect(index).toContain('href="/favicon.svg"');
    expect(index).toContain('src="/tema-inicial.js"');
    expect(index).not.toMatch(/(?:href|src)="(?!\/|#|https?:)[^"]+"/);
  });
});
