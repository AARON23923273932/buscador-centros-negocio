import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Resaltado, ResaltadoOrdenes } from '../../src/componentes/Resaltado.tsx';

const html = (texto: string, terminos: string[]) => renderToStaticMarkup(<Resaltado texto={texto} terminos={terminos} />);

describe('escapado y resaltado (componente Resaltado)', () => {
  it('escapa caracteres peligrosos', () => {
    expect(html(`<img src=x onerror="alert('x')">&`, [])).toBe('&lt;img src=x onerror=&quot;alert(&#x27;x&#x27;)&quot;&gt;&amp;');
  });
  it('resalta sin importar tildes ni mayúsculas', () => {
    expect(html('Mantenimiento Eléctrico', ['electrico'])).toBe('Mantenimiento <mark>Eléctrico</mark>');
    expect(html('Ñandú', ['nan'])).toBe('<mark>Ñan</mark>dú');
  });
  it('une coincidencias que se superponen', () => {
    expect(html('abcdef', ['bcd', 'cde'])).toBe('a<mark>bcde</mark>f');
    expect(html('aaa', ['a'])).toBe('<mark>aaa</mark>');
  });
  it('NUNCA deja pasar HTML del Excel, aunque coincida con la búsqueda', () => {
    const resultado = html('<script>alert(1)</script>', ['script']);
    expect(resultado).not.toContain('<script>');
    expect(resultado).toBe('&lt;<mark>script</mark>&gt;alert(1)&lt;/<mark>script</mark>&gt;');
  });
  it('resalta también lo encontrado con la versión "compacta" (sin guiones ni signos)', () => {
    expect(html('CN-0005', ['cn0005'])).toBe('<mark>CN-0005</mark>');
    expect(html('CN-1', ['cn1'])).toBe('<mark>CN-1</mark>');
    expect(html('Orden OS-2026-0001', ['os20260001'])).toBe('Orden <mark>OS-2026-0001</mark>');
    expect(html('CN-0001 y CN0001', ['cn0001'])).toBe('CN-0001 y <mark>CN0001</mark>');
    expect(html('<b>CN-1</b>', ['cn1'])).toBe('&lt;b&gt;<mark>CN-1</mark>&lt;/b&gt;');
  });
  it('sin términos solo escapa', () => {
    expect(html('a & b', [])).toBe('a &amp; b');
    expect(html('', ['x'])).toBe('');
  });
});

describe('celda de órdenes (componente ResaltadoOrdenes)', () => {
  const ordenes = (texto: string, terminos: string[]) => renderToStaticMarkup(<ResaltadoOrdenes texto={texto} terminos={terminos} />);

  it('varias órdenes: una línea (bloque) por orden, con el resaltado dentro de su línea', () => {
    expect(ordenes('OC 533 OC N° 3519522', ['3519522'])).toBe(
      '<span class="orden-linea block">OC 533</span><span class="orden-linea block">OC N° <mark>3519522</mark></span>',
    );
  });
  it('una sola orden (o ninguna reconocible): igual que antes, sin líneas', () => {
    expect(ordenes('OC-0000098263-2025', ['2025'])).toBe('OC-0000098263-<mark>2025</mark>');
    expect(ordenes('0004500100', [])).toBe('0004500100');
  });
  it('también escapa el texto del Excel', () => {
    expect(ordenes('OC 1 <b>OC 2</b>', [])).toBe('<span class="orden-linea block">OC 1 &lt;b&gt;</span><span class="orden-linea block">OC 2&lt;/b&gt;</span>');
  });
});
