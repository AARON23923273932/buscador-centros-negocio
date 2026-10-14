// Publicación con rutas (React Router): al abrir o recargar /centros/A2338PY01 el servidor no tiene un
// archivo con ese nombre y debe responder index.html; los archivos que sí existen se sirven igual.
// Además, con rutas anidadas los archivos de la app se piden desde la raíz ("/…"), no relativos.
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
    // "200!" (forzado) serviría index.html también en vez de config.json, assets/…, redirect.html.
    expect(reglas.join(' ')).not.toContain('!');
  });

  it('Azure Static Web Apps: navigationFallback a index.html, salvo archivos (assets, config.json, redirect.html…)', () => {
    const config = JSON.parse(leer('public/staticwebapp.config.json')) as { navigationFallback: { rewrite: string; exclude: string[] } };
    expect(config.navigationFallback.rewrite).toBe('/index.html');
    expect(config.navigationFallback.exclude).toEqual(expect.arrayContaining(['/assets/*', '/redirect.html', '/config.json']));
  });

  it('Azure Static Web Apps: index.html sin caché larga también en /ordenes y /centros/… (cabecera global)', () => {
    // Las reglas de "routes" NO se aplican a lo que responde navigationFallback (documentación de Microsoft,
    // "Fallback routes"): una regla para /index.html no alcanzaría a /centros/A2338PY01. Por eso "no-cache" va en
    // globalHeaders (vale para toda respuesta) y solo los archivos con huella (assets/…) la cambian por una larga.
    type Regla = { route: string; headers?: Record<string, string> };
    const config = JSON.parse(leer('public/staticwebapp.config.json')) as { routes: Regla[]; globalHeaders: Record<string, string> };
    expect(config.globalHeaders['Cache-Control']).toBe('no-cache');
    const cabecera = (ruta: string) => config.routes.find((r) => r.route === ruta)?.headers?.['Cache-Control'];
    expect(cabecera('/assets/*')).toBe('public, max-age=31536000, immutable');
    expect(cabecera('/config.json')).toContain('no-store');
    expect(config.routes.some((r) => r.route === '/index.html')).toBe(false); // no haría nada en las rutas de la app
  });

  it('la app se publica en la raíz (base "/") y index.html pide sus archivos desde "/"', () => {
    expect(leer('vite.config.ts')).toMatch(/^\s*base: '\/',$/m);
    const index = leer('index.html');
    expect(index).toContain('href="/favicon.svg"');
    expect(index).toContain('src="/tema-inicial.js"');
    expect(index).not.toMatch(/(?:href|src)="(?!\/|#|https?:)[^"]+"/); // nada relativo a la ruta actual
  });
});
