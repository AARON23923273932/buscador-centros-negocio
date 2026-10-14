// @vitest-environment jsdom
// Rendimiento de la pantalla principal (con el Excel real, miles de filas, sobre todo en el celular):
// escribir en el buscador o en un filtro, cambiar de página, el aviso flotante o el botón ☀️/🌙
// NO deben volver a dibujar toda la tabla ni volver a buscar en todas las filas.
//
// Cómo se mide: las funciones de logica/filtros.ts se "espían" (se cuentan sus llamadas, pero hacen lo
// mismo de siempre). Cada celda de la tabla llama a segmentosResaltado() al dibujarse (Resaltado.tsx),
// así que "0 llamadas" = la tabla no se volvió a dibujar.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App.tsx';
import { Enrutador } from '../../src/componentes/Enrutador.tsx';
import { CONFIG_POR_DEFECTO, type Config } from '../../src/logica/config.ts';
import { filtrarFilas, ordenarFilas, segmentosResaltado, sePuedeFiltrar, valoresUnicos } from '../../src/logica/filtros.ts';
import { abrirRutas } from './ayuda-rutas.tsx';

vi.mock('../../src/logica/filtros.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/logica/filtros.ts')>();
  return {
    ...real,
    filtrarFilas: vi.fn(real.filtrarFilas),
    ordenarFilas: vi.fn(real.ordenarFilas),
    segmentosResaltado: vi.fn(real.segmentosResaltado),
    sePuedeFiltrar: vi.fn(real.sePuedeFiltrar),
    valoresUnicos: vi.fn(real.valoresUnicos),
  };
});

const ESPIAS = { filtrarFilas, ordenarFilas, segmentosResaltado, sePuedeFiltrar, valoresUnicos } as const;
type NombreEspia = keyof typeof ESPIAS;
const llamadas = (nombre: NombreEspia) => vi.mocked(ESPIAS[nombre]).mock.calls.length;
const reiniciarEspias = () => Object.values(ESPIAS).forEach((f) => vi.mocked(f).mockClear());

const EJEMPLO = readFileSync(resolve(import.meta.dirname, '../../public/datos/centros-ejemplo.xlsx'));
const CONFIG: Config = { ...structuredClone(CONFIG_POR_DEFECTO), autoActualizarMinutos: 0 };

/** fetch de mentira: config.json (modo demo) y el Excel de ejemplo. */
function simularRed() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      String(url).endsWith('config.json')
        ? Response.json({ modo: 'demo', autoActualizarMinutos: 0 })
        : new Response(new Uint8Array(EJEMPLO), { headers: { 'last-modified': 'Thu, 08 Oct 2026 21:45:00 GMT' } }),
    ),
  );
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(async () => {}) } });
}

const contador = () => document.getElementById('contador')?.textContent;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  localStorage.clear();
  simularRed();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  history.replaceState(null, '', '/');
});

describe('PantallaApp (rutas /ordenes y /centros): escribir no vuelve a dibujar la tabla', () => {
  it('cada tecla en el buscador o en un filtro "contiene" solo cambia la caja (la tabla espera los 200 ms)', async () => {
    abrirRutas({ config: CONFIG, sesion: null, avisar: () => {} });
    await waitFor(() => expect(contador()).toBe('Mostrando 1–50 de 80 resultados (de 80 en total)'));
    reiniciarEspias();

    const buscador = screen.getByLabelText('Buscar') as HTMLInputElement;
    for (const parcial of ['m', 'ma', 'man', 'mant', 'mante']) fireEvent.change(buscador, { target: { value: parcial } });
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'cab' } });
    // Lo escrito ya se ve (y aparece el botón ×)…
    expect(buscador.value).toBe('mante');
    expect(screen.getByRole('button', { name: 'Borrar búsqueda' }).hidden).toBe(false);
    // …pero la tabla no se volvió a dibujar, no se buscó en las filas ni se recalcularon los desplegables.
    expect(llamadas('segmentosResaltado')).toBe(0);
    expect(llamadas('filtrarFilas')).toBe(0);
    expect(llamadas('sePuedeFiltrar')).toBe(0);
    expect(llamadas('valoresUnicos')).toBe(0);

    // Comprobación de que los espías funcionan: al aplicarse el filtro, la tabla sí se dibuja de nuevo.
    fireEvent.change(buscador, { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: '' } });
    fireEvent.change(buscador, { target: { value: 'cn0005' } });
    await waitFor(() => expect(contador()).toBe('Mostrando 1–3 de 3 resultados (de 80 en total)'));
    expect(llamadas('filtrarFilas')).toBeGreaterThan(0);
    expect(llamadas('segmentosResaltado')).toBeGreaterThan(0);
  });

  it('cambiar de página no vuelve a filtrar ni a ordenar todas las filas (solo corta otra página)', async () => {
    abrirRutas({ config: CONFIG, sesion: null, avisar: () => {} });
    await waitFor(() => expect(contador()).toBe('Mostrando 1–50 de 80 resultados (de 80 en total)'));
    fireEvent.click(document.querySelector<HTMLButtonElement>('[data-orden="descripcionCentro"]')!);
    await waitFor(() => expect(location.search).toContain('ord=descripcionCentro'));
    reiniciarEspias();

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(contador()).toBe('Mostrando 51–80 de 80 resultados (de 80 en total)'));
    expect(llamadas('filtrarFilas')).toBe(0);
    expect(llamadas('ordenarFilas')).toBe(0);
    expect(llamadas('segmentosResaltado')).toBeGreaterThan(0); // la página nueva sí se dibuja

    reiniciarEspias();
    fireEvent.change(screen.getByLabelText('Filas por página'), { target: { value: '25' } });
    await waitFor(() => expect(contador()).toBe('Mostrando 1–25 de 80 resultados (de 80 en total)'));
    expect(llamadas('filtrarFilas')).toBe(0);
    expect(llamadas('ordenarFilas')).toBe(0);
  });

  it('abrir otro centro (vista "Por centro") no vuelve a dibujar las órdenes de los centros ya abiertos', async () => {
    // La vista "Por centro" es la ruta /centros.
    abrirRutas({ config: CONFIG, sesion: null, avisar: () => {} }, '/centros');
    await waitFor(() => expect(contador()).toMatch(/centros/));
    const botones = () => screen.getAllByRole('button', { name: /^Ver órdenes de / });
    fireEvent.click(botones()[0]);
    const filasAbiertas = document.querySelectorAll('.fila-detalle tbody tr').length;
    expect(filasAbiertas).toBeGreaterThan(0);
    reiniciarEspias();

    fireEvent.click(botones()[0]); // abre el segundo centro (el primero ya dice "Ocultar")
    const filasNuevas = document.querySelectorAll('.fila-detalle tbody tr').length - filasAbiertas;
    const columnas = document.querySelectorAll('.tabla-anidada thead th').length / 2;
    // Solo se dibujan las celdas de la fila del centro y las de las órdenes del centro que se abrió.
    const celdasCentros = document.querySelectorAll('.fila-centro').length * 3;
    expect(llamadas('segmentosResaltado')).toBeLessThanOrEqual(celdasCentros + filasNuevas * columnas);
  });
});

describe('App: el aviso flotante y el botón de tema no vuelven a dibujar la tabla', () => {
  it('copiar un código (aviso "Código … copiado") y cambiar a modo oscuro no tocan la tabla', async () => {
    render(
      <Enrutador>
        <App />
      </Enrutador>,
    );
    await waitFor(() => expect(contador()).toBe('Mostrando 1–50 de 80 resultados (de 80 en total)'));
    reiniciarEspias();

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a modo oscuro' }));
    expect(document.documentElement.getAttribute('data-tema-efectivo')).toBe('oscuro');

    fireEvent.click(screen.getAllByRole('button', { name: /^Copiar código / })[0]);
    await waitFor(() => expect(document.getElementById('aviso-flotante')?.textContent).toMatch(/^Código .+ copiado$/));
    await act(async () => {}); // termina de procesar el aviso

    expect(llamadas('segmentosResaltado')).toBe(0);
    expect(llamadas('filtrarFilas')).toBe(0);
  });
});
