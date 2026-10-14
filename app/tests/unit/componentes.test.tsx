// @vitest-environment jsdom
// Pruebas de componentes y hooks de React en una página simulada (jsdom): teclado, foco, espera
// de 200 ms del buscador, botón de tema y la pantalla principal completa con el Excel de ejemplo.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvisoError, AvisoFlotante } from '../../src/componentes/Avisos.tsx';
import { BotonTema } from '../../src/componentes/BotonTema.tsx';
import { Filtros } from '../../src/componentes/Filtros.tsx';
import { Paginacion } from '../../src/componentes/Paginacion.tsx';
import { PantallaApp } from '../../src/componentes/PantallaApp.tsx';
import { useAvisoFlotante } from '../../src/hooks/useAvisoFlotante.ts';
import { useBusqueda } from '../../src/hooks/useBusqueda.ts';
import { useTema } from '../../src/hooks/useTema.ts';
import { CONFIG_POR_DEFECTO, type Config } from '../../src/logica/config.ts';
import { leerLibro } from '../../src/logica/datos.ts';
import { estadoInicial } from '../../src/logica/estado-url.ts';
import { paginar } from '../../src/logica/filtros.ts';
import { CLAVE_TEMA } from '../../src/logica/tema.ts';
import { estadoControles } from '../../src/logica/vista.ts';
import { crearExcelDesdeMatriz } from './ayuda.ts';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  history.replaceState(null, '', '/');
});

describe('useBusqueda (cajas de texto con espera)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('filtra 200 ms después de la última tecla; Enter filtra ya', () => {
    const { result } = renderHook(() => useBusqueda(50));
    act(() => result.current.escribir('q', 'cab'));
    act(() => result.current.escribir('q', 'cableado'));
    expect(result.current.borradores.q).toBe('cableado');
    expect(result.current.estado.q).toBe('');
    act(() => vi.advanceTimersByTime(199));
    expect(result.current.estado.q).toBe('');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.estado.q).toBe('cableado');

    act(() => result.current.escribir('codigo', 'CN-0'));
    act(() => result.current.aplicarYa('codigo'));
    expect(result.current.estado).toMatchObject({ codigo: 'CN-0', pagina: 1 });
  });

  it('"Limpiar filtros" vacía todo y cancela lo que estaba por aplicarse', () => {
    const { result } = renderHook(() => useBusqueda(50));
    act(() => result.current.elegir('estado', 'Abierta'));
    act(() => result.current.escribir('orden', '4500'));
    act(() => result.current.limpiar());
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.estado).toMatchObject({ estado: '', orden: '' });
    expect(result.current.borradores.orden).toBe('');
  });

  it('ordenar: la primera vez ascendente, la segunda descendente; cambiar de vista quita el orden', () => {
    const { result } = renderHook(() => useBusqueda(50));
    act(() => result.current.irAPagina(3));
    act(() => result.current.ordenar('cliente'));
    expect(result.current.estado).toMatchObject({ ordenarPor: 'cliente', direccion: 'asc', pagina: 1 });
    act(() => result.current.ordenar('cliente'));
    expect(result.current.estado.direccion).toBe('desc');
    act(() => result.current.cambiarVista('centro'));
    expect(result.current.estado).toMatchObject({ vista: 'centro', ordenarPor: '', direccion: 'asc' });
  });

  it('al leer el Excel se vacían las cajas de los filtros que no se pueden usar', () => {
    const { result } = renderHook(() => useBusqueda(50));
    act(() => result.current.escribir('codigo', 'CN'));
    act(() => result.current.escribir('q', 'algo'));
    const datos = leerLibro(crearExcelDesdeMatriz([['Cliente', 'Orden de compra'], ['Demo', 'OC-1']]), {
      columnas: CONFIG_POR_DEFECTO.columnas,
    });
    act(() => result.current.ajustarAColumnas(datos));
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.borradores).toMatchObject({ codigo: '', q: 'algo' });
    expect(result.current.estado).toMatchObject({ codigo: '', q: 'algo' });
  });

  it('lee la búsqueda inicial de la dirección (enlace compartido)', () => {
    history.replaceState(null, '', '/?q=fibra&estado=Cerrada&vista=centro&tam=25');
    const { result } = renderHook(() => useBusqueda(50));
    expect(result.current.estado).toMatchObject({ q: 'fibra', estado: 'Cerrada', vista: 'centro', tamano: 25 });
    expect(result.current.borradores.q).toBe('fibra');
  });
});

describe('Paginacion (foco con teclado)', () => {
  it('si el botón con el foco queda desactivado, el foco pasa a "Página X de Y"', () => {
    const { rerender } = render(<Paginacion pagina={paginar([1, 2, 3], 1, 2)} />);
    const siguiente = screen.getByRole('button', { name: 'Página siguiente' });
    siguiente.focus();
    fireEvent.click(siguiente);
    rerender(<Paginacion pagina={paginar([1, 2, 3], 2, 2)} />);
    const actual = screen.getByText('Página 2 de 2');
    expect(document.activeElement).toBe(actual);
    expect(actual.tabIndex).toBe(-1);
  });

  it('si el botón sigue activo, conserva el foco', () => {
    const lista = Array.from({ length: 9 }, (_, i) => i);
    const { rerender } = render(<Paginacion pagina={paginar(lista, 1, 2)} />);
    const siguiente = screen.getByRole('button', { name: 'Página siguiente' });
    siguiente.focus();
    fireEvent.click(siguiente);
    rerender(<Paginacion pagina={paginar(lista, 2, 2)} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Página siguiente' }));
  });

  it('sin resultados no hay botones', () => {
    render(<Paginacion pagina={paginar([], 1, 50)} />);
    expect(screen.getByRole('navigation', { name: 'Paginación de resultados' }).childElementCount).toBe(0);
  });
});

describe('Filtros', () => {
  const props = {
    estado: { ...estadoInicial(50), cliente: 'Cliente que vino en el enlace' },
    borradores: { q: '', codigo: '', descripcion: '', orden: '' },
    controles: estadoControles(null),
    opciones: { cliente: ['Cliente Demo A'], tipo: [], estado: [] },
    mostrarTipo: false,
    mostrarEstado: false,
    activos: 1,
    limpiarDesactivado: false,
    alEscribir: () => {},
    alAplicarYa: () => {},
    alElegir: () => {},
    alLimpiar: () => {},
  };

  it('el desplegable muestra "Todos", las opciones del Excel y el valor elegido aunque no esté en la lista', () => {
    render(<Filtros {...props} />);
    const cliente = screen.getByLabelText('Cliente') as HTMLSelectElement;
    expect([...cliente.options].map((o) => o.textContent)).toEqual(['Todos', 'Cliente Demo A', 'Cliente que vino en el enlace']);
    expect(cliente.value).toBe('Cliente que vino en el enlace');
    expect(screen.getByText('1')).toHaveProperty('hidden', false);
  });

  it('un filtro que no se puede usar queda desactivado y explica por qué', () => {
    const controles = { ...props.controles, codigo: { disponible: false, motivo: 'No se encontró esta columna en el Excel' } };
    render(<Filtros {...props} controles={controles} />);
    const codigo = screen.getByLabelText('Código') as HTMLInputElement;
    expect(codigo.disabled).toBe(true);
    expect(codigo.title).toBe('No se encontró esta columna en el Excel');
  });

  it('Enter en una caja "contiene" filtra ya; el botón "Filtros" abre el panel en el celular', () => {
    const alAplicarYa = vi.fn();
    render(<Filtros {...props} alAplicarYa={alAplicarYa} />);
    fireEvent.keyDown(screen.getByLabelText('Orden de compra / servicio'), { key: 'Enter' });
    expect(alAplicarYa).toHaveBeenCalledWith('orden');
    const boton = screen.getByRole('button', { name: /^Filtros/ });
    fireEvent.click(boton);
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('panel-filtros')?.classList.contains('abierto')).toBe(true);
  });
});

describe('Avisos (AvisoError y AvisoFlotante)', () => {
  it('oculto sin error; con error muestra el mensaje y sus botones', () => {
    const reintentar = vi.fn();
    const { rerender, container } = render(<AvisoError error={null} />);
    expect((container.firstChild as HTMLElement).hidden).toBe(true);
    rerender(<AvisoError error={{ mensaje: 'No se encontró el Excel.', acciones: [{ texto: 'Reintentar', accion: reintentar }], id: 1 }} />);
    const aviso = screen.getByRole('alert');
    expect(aviso.hidden).toBe(false);
    expect(aviso.textContent).toBe('No se encontró el Excel. Reintentar');
    fireEvent.click(within(aviso).getByRole('button', { name: 'Reintentar' }));
    expect(reintentar).toHaveBeenCalledOnce();
  });

  // Los lectores de pantalla leen role="alert"/"status" cuando su contenido CAMBIA en la página. React no
  // toca la página si el texto es el mismo: por eso cada aviso nuevo debe poner un nodo de texto nuevo.
  it('el mismo error repetido (otro id) vuelve a poner el texto en la página; los botones no se recrean', () => {
    const acciones = [{ texto: 'Reintentar', accion: () => {} }];
    const { rerender } = render(<AvisoError error={{ mensaje: 'Sin conexión.', acciones, id: 1 }} />);
    const aviso = screen.getByRole('alert');
    const texto = aviso.querySelector('span');
    const boton = within(aviso).getByRole('button', { name: 'Reintentar' });
    rerender(<AvisoError error={{ mensaje: 'Sin conexión.', acciones, id: 2 }} />);
    expect(aviso.querySelector('span')).not.toBe(texto);
    expect(aviso.textContent).toBe('Sin conexión. Reintentar');
    expect(within(aviso).getByRole('button', { name: 'Reintentar' })).toBe(boton);
  });

  it('el aviso flotante vuelve a poner el texto aunque el mensaje se repita (ej. "Datos actualizados" dos veces)', () => {
    function ConAviso() {
      const { aviso, avisar } = useAvisoFlotante();
      return (
        <>
          <button type="button" onClick={() => avisar('Datos actualizados')}>
            Avisar
          </button>
          <AvisoFlotante aviso={aviso} />
        </>
      );
    }
    render(<ConAviso />);
    const caja = screen.getByRole('status');
    expect(caja.textContent).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Avisar' }));
    const primero = caja.firstChild;
    expect(caja.textContent).toBe('Datos actualizados');
    expect(caja.classList.contains('visible')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Avisar' }));
    expect(caja.textContent).toBe('Datos actualizados');
    expect(caja.firstChild).not.toBe(primero);
  });
});

describe('Botón de tema (useTema + BotonTema)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-tema');
    document.documentElement.removeAttribute('data-tema-efectivo');
  });

  function ConBoton() {
    return <BotonTema tema={useTema()} />;
  }

  it('sin elección sigue al sistema; al pulsar cambia, lo marca en <html> y lo recuerda', () => {
    render(<ConBoton />);
    const raiz = document.documentElement;
    expect(raiz.getAttribute('data-tema-efectivo')).toBe('claro'); // jsdom no tiene modo oscuro
    expect(raiz.hasAttribute('data-tema')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a modo oscuro' }));
    expect(raiz.getAttribute('data-tema')).toBe('oscuro');
    expect(raiz.getAttribute('data-tema-efectivo')).toBe('oscuro');
    expect(localStorage.getItem(CLAVE_TEMA)).toBe('oscuro');
    expect(screen.getByRole('button', { name: 'Cambiar a modo claro' }).title).toBe('Cambiar a modo claro');
  });

  it('respeta la elección guardada', () => {
    localStorage.setItem(CLAVE_TEMA, 'oscuro');
    render(<ConBoton />);
    expect(document.documentElement.getAttribute('data-tema-efectivo')).toBe('oscuro');
  });
});

describe('PantallaApp con el Excel de ejemplo (modo demo, sin navegador real)', () => {
  const EJEMPLO = readFileSync(resolve(import.meta.dirname, '../../public/datos/centros-ejemplo.xlsx'));
  const CONFIG: Config = { ...structuredClone(CONFIG_POR_DEFECTO), autoActualizarMinutos: 0 };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('carga, busca con espera, deja la búsqueda en la URL y avisa al copiar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Uint8Array(EJEMPLO), { headers: { 'last-modified': 'Thu, 08 Oct 2026 21:45:00 GMT' } })),
    );
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(async () => {}) } });
    const avisar = vi.fn();
    render(<PantallaApp config={CONFIG} sesion={null} avisar={avisar} />);

    const contador = document.getElementById('contador')!;
    await waitFor(() => expect(contador.textContent).toBe('Mostrando 1–50 de 80 resultados (de 80 en total)'));
    expect(document.getElementById('aviso-demo')?.hidden).toBe(false);
    expect(document.getElementById('texto-actualizado')?.textContent).toMatch(/^Datos actualizados a las \d{2}:\d{2} · Excel modificado el 08\/10\/2026/);
    expect(document.querySelectorAll('#tabla-resultados thead th')).toHaveLength(7); // sin Monto ni Moneda
    expect(screen.getByRole('button', { name: 'Exportar a Excel' })).toHaveProperty('disabled', false);
    expect(location.search).toBe(''); // estado normal = URL limpia

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'cn0005' } });
    expect(screen.getByRole('button', { name: 'Borrar búsqueda' }).hidden).toBe(false);
    await waitFor(() => expect(contador.textContent).toBe('Mostrando 1–3 de 3 resultados (de 80 en total)'));
    expect(location.search).toBe('?q=cn0005');
    expect(document.querySelector('#tabla-resultados mark')?.textContent).toBe('CN-0005');

    fireEvent.click(screen.getAllByRole('button', { name: 'Copiar código CN-0005' })[0]);
    await waitFor(() => expect(avisar).toHaveBeenCalledWith('Código CN-0005 copiado'));

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(document.activeElement).toBe(screen.getByLabelText('Buscar'));
    expect(avisar).toHaveBeenCalledWith('Filtros limpiados');
    await waitFor(() => expect(location.search).toBe(''));
  });

  it('si el Excel no está: aviso con "Reintentar", tabla sin datos y exportar desactivado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    render(<PantallaApp config={CONFIG} sesion={null} avisar={() => {}} />);
    const aviso = await screen.findByRole('alert');
    await waitFor(() => expect(aviso.textContent).toContain('No se encontró el archivo de Excel'));
    expect(document.getElementById('texto-actualizado')?.textContent).toBe('No se pudieron cargar los datos.');
    expect(document.getElementById('contenedor-tabla')?.textContent).toBe('No hay datos para mostrar. Revisa el mensaje de arriba.');
    expect(screen.getByRole('button', { name: 'Exportar a Excel' })).toHaveProperty('disabled', true);
    expect(within(aviso).getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('si "Reintentar" vuelve a fallar con el mismo mensaje, el aviso se vuelve a anunciar y el botón conserva el foco', async () => {
    const pedir = vi.fn(async () => new Response('', { status: 404 }));
    vi.stubGlobal('fetch', pedir);
    render(<PantallaApp config={CONFIG} sesion={null} avisar={() => {}} />);
    const aviso = await screen.findByRole('alert');
    await waitFor(() => expect(aviso.textContent).toContain('No se encontró el archivo de Excel (datos/centros-ejemplo.xlsx).'));
    const texto = aviso.querySelector('span');
    const reintentar = within(aviso).getByRole('button', { name: 'Reintentar' });
    reintentar.focus();
    fireEvent.click(reintentar);
    await waitFor(() => expect(pedir).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(document.getElementById('contenedor-tabla')?.getAttribute('aria-busy')).toBe('false'));
    expect(aviso.querySelector('span')).not.toBe(texto); // texto nuevo en la página = el lector lo vuelve a leer
    expect(aviso.querySelector('span')?.textContent).toBe(texto?.textContent);
    expect(document.activeElement).toBe(reintentar);
  });

  const excelOk = () => new Response(new Uint8Array(EJEMPLO), { headers: { 'last-modified': 'Thu, 08 Oct 2026 21:45:00 GMT' } });

  it('mientras se reintenta sin datos: la tabla dice "Cargando…" y arriba sigue "No se pudieron cargar los datos."', async () => {
    let responder: (r: Response) => void = () => {};
    const pedir = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockImplementationOnce(() => new Promise((r) => (responder = r)));
    vi.stubGlobal('fetch', pedir);
    render(<PantallaApp config={CONFIG} sesion={null} avisar={() => {}} />);
    const texto = document.getElementById('texto-actualizado')!;
    const tabla = document.getElementById('contenedor-tabla')!;
    await waitFor(() => expect(tabla.textContent).toBe('No hay datos para mostrar. Revisa el mensaje de arriba.'));
    expect(texto.textContent).toBe('No se pudieron cargar los datos.');

    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(tabla.textContent?.trim()).toBe('Cargando datos del Excel…'));
    expect(texto.textContent).toBe('No se pudieron cargar los datos.');

    await act(async () => responder(excelOk()));
    await waitFor(() => expect(document.getElementById('contador')?.textContent).toBe('Mostrando 1–50 de 80 resultados (de 80 en total)'));
    expect(texto.textContent).toMatch(/^Datos actualizados a las \d{2}:\d{2}/);
  });

  it('si falla una actualización con datos ya cargados: se siguen mostrando y el aviso dice de qué hora son', async () => {
    const pedir = vi.fn<() => Promise<Response>>().mockResolvedValueOnce(excelOk()).mockResolvedValue(new Response('', { status: 404 }));
    vi.stubGlobal('fetch', pedir);
    render(<PantallaApp config={CONFIG} sesion={null} avisar={() => {}} />);
    const contador = document.getElementById('contador')!;
    await waitFor(() => expect(contador.textContent).toBe('Mostrando 1–50 de 80 resultados (de 80 en total)'));
    const hora = document.getElementById('texto-actualizado')?.textContent?.match(/a las (\d{2}:\d{2})/)?.[1];

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    const aviso = await screen.findByRole('alert');
    expect(aviso.textContent).toContain(
      `No se pudo actualizar: No se encontró el archivo de Excel (datos/centros-ejemplo.xlsx). Se siguen mostrando los datos de las ${hora}.`,
    );
    expect(contador.textContent).toBe('Mostrando 1–50 de 80 resultados (de 80 en total)');
  });

  it('al volver a la pestaña después de mucho tiempo, vuelve a leer el Excel', async () => {
    const pedir = vi.fn(async () => excelOk());
    vi.stubGlobal('fetch', pedir);
    render(<PantallaApp config={{ ...CONFIG, autoActualizarMinutos: 10 }} sesion={null} avisar={() => {}} />);
    await waitFor(() => expect(document.getElementById('contador')?.textContent).toMatch(/^Mostrando/));
    expect(pedir).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event('visibilitychange')); // recién leído: no hace nada
    expect(pedir).toHaveBeenCalledTimes(1);

    const ahora = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(ahora + 11 * 60 * 1000); // 11 minutos después
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(pedir).toHaveBeenCalledTimes(2));
  });
});
