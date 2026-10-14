// El resaltado de la búsqueda se dibuja con <mark> de React: el texto del Excel siempre se "escapa".
// renderToStaticMarkup = el HTML que React pondría en la página (sin abrir un navegador).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Resaltado } from '../../src/componentes/Resaltado.tsx';

const html = (texto: unknown, terminos: string[]) => renderToStaticMarkup(<Resaltado texto={texto} terminos={terminos} />);

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
    // Si el término aparece tal cual, se marca solo eso.
    expect(html('CN-0001 y CN0001', ['cn0001'])).toBe('CN-0001 y <mark>CN0001</mark>');
    expect(html('<b>CN-1</b>', ['cn1'])).toBe('&lt;b&gt;<mark>CN-1</mark>&lt;/b&gt;');
  });
  it('sin términos solo escapa', () => {
    expect(html('a & b', [])).toBe('a &amp; b');
    expect(html(null, ['x'])).toBe('');
  });
});
