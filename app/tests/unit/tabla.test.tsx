// Las tablas y la paginación (componentes de React), revisadas con el HTML que dibujan.
// renderToStaticMarkup = el HTML que React pondría en la página (sin abrir un navegador).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ContenidoCelda } from '../../src/componentes/Celdas.tsx';
import { IconoOrden } from '../../src/componentes/Iconos.tsx';
import { Paginacion } from '../../src/componentes/Paginacion.tsx';
import { TablaCentros } from '../../src/componentes/TablaCentros.tsx';
import { TablaOrdenes } from '../../src/componentes/TablaOrdenes.tsx';
import { agruparPorCentro, paginar, prepararFila } from '../../src/logica/filtros.ts';
import { textoContador } from '../../src/logica/tabla.ts';
import type { Columna } from '../../src/logica/tipos.ts';
import { filaDePrueba } from './ayuda.ts';

const COLUMNAS: Columna[] = [
  { indice: 0, letra: 'A', titulo: 'Código', campo: 'codigoCentro', clave: 'codigoCentro', tipo: 'texto' },
  { indice: 1, letra: 'B', titulo: 'Descripción', campo: 'descripcionCentro', clave: 'descripcionCentro', tipo: 'texto' },
  { indice: 2, letra: 'C', titulo: 'Cliente <b>', campo: 'cliente', clave: 'cliente', tipo: 'texto' },
];
const MALICIOSO = '<img src=x onerror="alert(1)">';
const FILAS = [
  filaDePrueba(3, { codigoCentro: 'CN-"1"', descripcionCentro: MALICIOSO, cliente: 'Demo & Cía' }),
  filaDePrueba(4, { codigoCentro: 'CN-"1"', descripcionCentro: 'Otra', cliente: 'Demo & Cía' }),
].map(prepararFila);

const sinTerminos = () => [];

describe('TablaOrdenes', () => {
  const html = renderToStaticMarkup(
    <TablaOrdenes columnas={COLUMNAS} filas={FILAS} terminosDe={() => ['img']} ordenarPor="cliente" direccion="desc" />,
  );
  it('escapa todo dato del Excel (incluidos títulos y atributos)', () => {
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;<mark>img</mark> src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(html).toContain('data-copiar="CN-&quot;1&quot;"');
    expect(html).toContain('Demo &amp; Cía');
  });
  it('marca la columna ordenada con aria-sort', () => {
    expect(html).toMatch(/aria-sort="descending"[^>]*>\s*<button[^>]*data-orden="cliente"/);
    expect((html.match(/aria-sort="none"/g) || []).length).toBe(2);
  });
  it('muestra un mensaje si no hay resultados', () => {
    const vacia = renderToStaticMarkup(<TablaOrdenes columnas={COLUMNAS} filas={[]} terminosDe={sinTerminos} ordenarPor="" direccion="asc" />);
    expect(vacia).toContain('No hay resultados');
  });
});

describe('IconoOrden (indicador ▲▼ de los títulos)', () => {
  /**
   * Las flechas que dibuja: "arriba" / "abajo" y si van tenues. Desde el pedido de Gustavo del 15/10/2026 (estilos
   * naturales de shadcn/ui: se permiten las transparencias de los colores de la marca), "tenue" = el ícono va al 60 %
   * del color del texto del encabezado (opacity-60; antes Border Gray con text-encabezado-icono, una variable propia
   * que ya no existe). Contraste medido: 5,1:1 en claro y 3,3:1 en oscuro (WCAG pide 3:1 en íconos).
   */
  const flechas = (aria: 'none' | 'ascending' | 'descending') => {
    const html = renderToStaticMarkup(<IconoOrden aria={aria} />);
    const tenue = /<svg[^>]*class="[^"]*\bopacity-60\b/.test(html);
    // Ninguna otra transparencia: solo la del ícono tenue.
    expect(html.match(/opacity/g) ?? []).toHaveLength(tenue ? 1 : 0);
    return [...html.matchAll(/<path[^>]*d="M12 (4\.5|19\.5)[^"]*"[^>]*>/g)].map((m) => ({
      flecha: m[1] === '4.5' ? 'arriba' : 'abajo',
      tenue,
    }));
  };

  it('ascendente: solo la flecha de arriba; descendente: solo la de abajo (ambas marcadas)', () => {
    expect(flechas('ascending')).toEqual([{ flecha: 'arriba', tenue: false }]);
    expect(flechas('descending')).toEqual([{ flecha: 'abajo', tenue: false }]);
  });

  it('sin ordenar: las dos flechas, tenues', () => {
    expect(flechas('none')).toEqual([
      { flecha: 'arriba', tenue: true },
      { flecha: 'abajo', tenue: true },
    ]);
  });

  it('el título ordenado lleva el ícono que coincide con su aria-sort', () => {
    const html = renderToStaticMarkup(<TablaOrdenes columnas={COLUMNAS} filas={FILAS} terminosDe={sinTerminos} ordenarPor="cliente" direccion="asc" />);
    const celda = /<th[^>]*aria-sort="ascending"[^>]*>[\s\S]*?<\/th>/.exec(html)?.[0] ?? '';
    expect(celda).toContain('data-orden="cliente"');
    expect(celda).toContain('d="M12 4.5');
    expect(celda).not.toContain('d="M12 19.5');
  });
});

describe('ContenidoCelda', () => {
  it('la celda de código lleva botón para copiar', () => {
    expect(renderToStaticMarkup(<ContenidoCelda columna={COLUMNAS[0]} celda={{ t: 'CN-0001' }} terminos={[]} />)).toContain(
      'aria-label="Copiar código CN-0001"',
    );
    expect(renderToStaticMarkup(<ContenidoCelda columna={COLUMNAS[1]} celda={{ t: 'x' }} terminos={[]} />)).toBe('x');
  });
});

describe('TablaCentros', () => {
  const grupos = agruparPorCentro(FILAS);
  it('una fila por centro y detalle solo si está expandido', () => {
    const cerrado = renderToStaticMarkup(
      <TablaCentros
        grupos={grupos}
        columnas={COLUMNAS}
        terminos={[]}
        terminosDe={sinTerminos}
        expandidos={new Set()}
        ordenarPor=""
        direccion="asc"
      />,
    );
    expect(cerrado).toContain('aria-expanded="false"');
    expect(cerrado).not.toContain('fila-detalle');
    expect(cerrado).not.toContain('data-state="selected"');
    expect(cerrado).not.toContain('<img');

    const abierto = renderToStaticMarkup(
      <TablaCentros
        grupos={grupos}
        columnas={COLUMNAS}
        terminos={[]}
        terminosDe={sinTerminos}
        expandidos={new Set([grupos[0].clave])}
        ordenarPor="ordenes"
        direccion="asc"
      />,
    );
    expect(abierto).toContain('aria-expanded="true"');
    expect(abierto).toContain('fila-detalle');
    // Centro abierto: su fila y la de sus órdenes con el estado "seleccionada" de la TableRow de shadcn/ui
    // (data-[state=selected]:bg-muted) en vez de una clase de color propia.
    expect((abierto.match(/data-state="selected"/g) || []).length).toBe(2);
    expect(abierto).not.toMatch(/[\s"]bg-muted\/50[\s"]/); // (sin la clase suelta; la TableRow trae hover:bg-muted/50)
    expect((abierto.match(/data-fila=/g) || []).length).toBe(2);
    expect(abierto).not.toContain('<img');
  });
  it('el filtro "Descripción" se resalta también en la fila del centro (igual que en la vista por orden)', () => {
    const filas = [filaDePrueba(5, { codigoCentro: 'CN-9', descripcionCentro: 'Óptica demo', cliente: 'Demo' })].map(prepararFila);
    const porCampo: Partial<Record<string, string>> = { descripcionCentro: 'optica' };
    const html = renderToStaticMarkup(
      <TablaCentros
        grupos={agruparPorCentro(filas)}
        columnas={COLUMNAS}
        terminos={[]}
        terminosDe={(col) => (col.campo && porCampo[col.campo] ? [porCampo[col.campo] as string] : [])}
        expandidos={new Set()}
        ordenarPor=""
        direccion="asc"
      />,
    );
    expect(html).toContain('<mark>Óptica</mark> demo');
  });
});

describe('paginación y contador', () => {
  it('desactiva botones en los extremos', () => {
    const html = renderToStaticMarkup(<Paginacion pagina={paginar([1, 2, 3], 1, 2)} />);
    expect(html).toMatch(/aria-label="Primera página" disabled=""/);
    expect(html).toContain('Página 1 de 2');
    expect(html).not.toMatch(/aria-label="Página siguiente" disabled/);
  });
  it('texto del contador', () => {
    expect(textoContador(paginar(Array(63).fill(0), 1, 50), 80, 'orden')).toBe('Mostrando 1–50 de 63 resultados (de 80 en total)');
    expect(textoContador(paginar([1], 1, 50), 30, 'centro')).toBe('Mostrando 1–1 de 1 centro (de 30 en total)');
    expect(textoContador(paginar([], 1, 50), 80, 'orden')).toBe('Sin resultados (de 80 en total)');
  });
});
