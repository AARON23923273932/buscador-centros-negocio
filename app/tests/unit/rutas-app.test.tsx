// @vitest-environment jsdom
// Las rutas de la app (React Router) en una página simulada (jsdom), con el Excel de ejemplo (modo demo):
// redirecciones, detalle de un centro, "Página no encontrada", el enlace del código y el botón atrás.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContenidoCelda } from '../../src/componentes/Celdas.tsx';
import { useBusqueda } from '../../src/hooks/useBusqueda.ts';
import { CONFIG_POR_DEFECTO, type Config } from '../../src/logica/config.ts';
import { crearExcelDesdeMatriz } from './ayuda.ts';
import { abrirRutas, ConEnrutador } from './ayuda-rutas.tsx';

const EJEMPLO = readFileSync(resolve(import.meta.dirname, '../../public/datos/centros-ejemplo.xlsx'));
const CONFIG: Config = { ...structuredClone(CONFIG_POR_DEFECTO), autoActualizarMinutos: 0 };
const PROPS = { config: CONFIG, sesion: null, avisar: () => {} };

let pedidos: string[] = [];
beforeEach(() => {
  pedidos = [];
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      pedidos.push(String(url));
      return new Response(new Uint8Array(EJEMPLO));
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  history.replaceState(null, '', '/');
});

const contador = () => document.getElementById('contador')?.textContent;

describe('rutas de la aplicación', () => {
  it('"/" lleva a /ordenes con la misma búsqueda; ?vista=centro lleva a /centros', async () => {
    abrirRutas(PROPS, '/?q=cableado');
    await waitFor(() => expect(location.pathname + location.search).toBe('/ordenes?q=cableado'));
    await waitFor(() => expect(contador()).toMatch(/^Mostrando .* resultados/));
    cleanup();

    abrirRutas(PROPS, '/?q=cableado&vista=centro');
    await waitFor(() => expect(location.pathname + location.search).toBe('/centros?q=cableado'));
    await waitFor(() => expect(contador()).toMatch(/^Mostrando .* centros/));
    expect((screen.getByRole('radio', { name: 'Por centro de negocio' }) as HTMLInputElement).checked).toBe(true);
  });

  it('el Excel se descarga una sola vez aunque se cambie de ruta (lista → detalle → lista)', async () => {
    abrirRutas(PROPS, '/ordenes?q=cn0005');
    await waitFor(() => expect(contador()).toBe('Mostrando 1–3 de 3 resultados (de 80 en total)'));
    fireEvent.click(screen.getAllByRole('link', { name: 'CN-0005' })[0]!);
    await waitFor(() => expect(location.pathname).toBe('/centros/CN-0005'));
    expect(location.search).toBe('?q=cn0005');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Centro de negocio CN-0005');
    expect(document.querySelectorAll('#tabla-detalle tbody tr')).toHaveLength(3);

    fireEvent.click(screen.getByRole('link', { name: 'Volver a la lista' }));
    await waitFor(() => expect(location.pathname + location.search).toBe('/ordenes?q=cn0005'));
    await waitFor(() => expect(contador()).toBe('Mostrando 1–3 de 3 resultados (de 80 en total)'));
    expect((screen.getByLabelText('Buscar') as HTMLInputElement).value).toBe('cn0005');
    expect(pedidos.filter((u) => u.endsWith('centros-ejemplo.xlsx'))).toEqual(['/datos/centros-ejemplo.xlsx']);
  });

  it('detalle de un código que no existe: mensaje claro', async () => {
    abrirRutas(PROPS, '/centros/NO-EXISTE');
    await waitFor(() => expect(document.getElementById('centro-no-encontrado')?.textContent).toContain('No se encontró el centro de negocio “NO-EXISTE”'));
    expect(document.getElementById('tabla-detalle')).toBeNull();
  });

  it('"Página no encontrada": no descarga el Excel y enlaza al buscador', async () => {
    abrirRutas(PROPS, '/esto/no/existe');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Página no encontrada');
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 }));
    expect(screen.getByRole('link', { name: 'Ir al buscador' }).getAttribute('href')).toBe('/ordenes');
    await act(async () => {});
    expect(pedidos).toEqual([]);
  });

  it('"Por centro" sin columnas de centro en el Excel: vuelve a /ordenes', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(crearExcelDesdeMatriz([['Cliente', 'Orden de compra'], ['Demo', 'OC-1']])))));
    abrirRutas(PROPS, '/centros?q=demo');
    await waitFor(() => expect(location.pathname + location.search).toBe('/ordenes?q=demo'));
    await waitFor(() => expect(contador()).toBe('Mostrando 1–1 de 1 resultado (de 1 en total)'));
  });
});

describe('búsqueda en la dirección con React Router (useBusqueda + useEstadoUrl)', () => {
  it('cambiar de vista agrega una entrada al historial; "atrás" vuelve a leer la búsqueda de esa entrada', async () => {
    history.replaceState(null, '', '/ordenes?q=a&ord=cliente&dir=desc');
    const { result } = renderHook(() => useBusqueda(50), { wrapper: ConEnrutador });
    expect(result.current.estado).toMatchObject({ q: 'a', ordenarPor: 'cliente', direccion: 'desc', vista: 'orden' });

    act(() => result.current.cambiarVista('centro'));
    expect(location.pathname + location.search).toBe('/centros?q=a');
    expect(result.current.estado).toMatchObject({ vista: 'centro', ordenarPor: '' });

    // Algo escrito que todavía no se aplicó (espera de 200 ms) no debe pisar lo que trae la dirección.
    act(() => result.current.escribir('q', 'abc'));
    act(() => history.back());
    await waitFor(() => expect(location.pathname).toBe('/ordenes'));
    await waitFor(() => expect(result.current.estado).toMatchObject({ q: 'a', ordenarPor: 'cliente', direccion: 'desc', vista: 'orden' }));
    expect(result.current.borradores.q).toBe('a');
    await new Promise((r) => setTimeout(r, 300));
    expect(result.current.estado.q).toBe('a');

    act(() => history.forward());
    await waitFor(() => expect(result.current.estado).toMatchObject({ vista: 'centro', ordenarPor: '', q: 'a' }));
  });
});

describe('enlace del código del centro', () => {
  it('dentro de React Router: enlace al detalle con la misma búsqueda (código codificado) + botón copiar', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/ordenes?q=red&estado=Abierta']}>
        <ContenidoCelda columna={{ campo: 'codigoCentro' }} celda={{ t: 'CN/1 #"A"' }} terminos={['cn']} />
      </MemoryRouter>,
    );
    expect(html).toContain('href="/centros/CN%2F1%20%23%22A%22?q=red&amp;estado=Abierta"');
    expect(html).toContain('class="codigo enlace-codigo"');
    expect(html).toContain('<mark>CN</mark>');
    expect(html).toContain('aria-label="Copiar código CN/1 #&quot;A&quot;"');
  });

  it('en el detalle (enlazar=false) o sin React Router: solo texto', () => {
    const enDetalle = renderToStaticMarkup(
      <MemoryRouter>
        <ContenidoCelda columna={{ campo: 'codigoCentro' }} celda={{ t: 'CN-1' }} terminos={[]} enlazar={false} />
      </MemoryRouter>,
    );
    expect(enDetalle).not.toContain('<a ');
    expect(renderToStaticMarkup(<ContenidoCelda columna={{ campo: 'codigoCentro' }} celda={{ t: 'CN-1' }} terminos={[]} />)).not.toContain('<a ');
  });

  it('el clic en "copiar" copia y NO abre el detalle; el clic en el código sí', () => {
    const copiar = vi.fn();
    function Ruta() {
      return <output data-testid="ruta">{useLocation().pathname}</output>;
    }
    render(
      <MemoryRouter initialEntries={['/ordenes']}>
        <ContenidoCelda columna={{ campo: 'codigoCentro' }} celda={{ t: 'CN-1' }} terminos={[]} alCopiar={copiar} />
        <Ruta />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Copiar código CN-1' }));
    expect(copiar).toHaveBeenCalledWith('CN-1');
    expect(screen.getByTestId('ruta').textContent).toBe('/ordenes');
    fireEvent.click(screen.getByRole('link', { name: 'CN-1' }));
    expect(screen.getByTestId('ruta').textContent).toBe('/centros/CN-1');
  });
});
