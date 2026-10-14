// @vitest-environment jsdom
// Mouse o teclado (logica/modalidad.ts): con el mouse no se dibuja el anillo de foco en cajas de texto y
// desplegables (estilos.css usa <html data-modalidad>). El anillo debe volver al usar Tab, pero NO aparecer
// de golpe mientras se escribe en una caja que se abrió con el mouse.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { modalidadDeTecla, vigilarModalidad } from '../../src/logica/modalidad.ts';

let dejarDeVigilar: () => void;
const modalidad = () => document.documentElement.dataset.modalidad;
const tecla = (destino: EventTarget, key: string, extra: KeyboardEventInit = {}) =>
  destino.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...extra }));
// jsdom no trae PointerEvent: un Event con ese nombre basta (solo se mira el tipo).
const apuntar = (destino: EventTarget) => destino.dispatchEvent(new Event('pointerdown', { bubbles: true }));

beforeEach(() => {
  document.body.innerHTML = '<input id="caja"><select id="lista"><option>a</option></select><button id="boton">B</button>';
  delete document.documentElement.dataset.modalidad;
  dejarDeVigilar = vigilarModalidad();
});
afterEach(() => {
  dejarDeVigilar();
  document.body.innerHTML = '';
  delete document.documentElement.dataset.modalidad;
});

describe('modalidad (mouse o teclado)', () => {
  it('al cargar no se sabe (sin atributo: el anillo se ve como con el teclado)', () => {
    expect(modalidad()).toBeUndefined();
  });

  it('un clic (mouse, dedo o lápiz) → "puntero"; Tab o Shift+Tab → "teclado"', () => {
    apuntar(document.getElementById('lista')!);
    expect(modalidad()).toBe('puntero');
    tecla(document.getElementById('lista')!, 'Tab');
    expect(modalidad()).toBe('teclado');
    apuntar(document.getElementById('caja')!);
    tecla(document.getElementById('caja')!, 'Tab', { shiftKey: true });
    expect(modalidad()).toBe('teclado');
  });

  it('escribir en una caja o elegir con las flechas en un desplegable abiertos con el mouse no cambia nada', () => {
    apuntar(document.getElementById('caja')!);
    for (const key of ['a', 'Enter', ' ', 'Backspace', 'ArrowDown']) tecla(document.getElementById('caja')!, key);
    expect(modalidad()).toBe('puntero');
    apuntar(document.getElementById('lista')!);
    tecla(document.getElementById('lista')!, 'ArrowDown');
    expect(modalidad()).toBe('puntero');
  });

  it('una tecla fuera de las cajas (ej. "/" para ir al buscador, Enter en un botón) → "teclado"; los atajos no', () => {
    apuntar(document.body);
    tecla(document.body, 'c', { ctrlKey: true });
    tecla(document.body, 'ArrowLeft', { altKey: true });
    expect(modalidad()).toBe('puntero');
    tecla(document.body, '/');
    expect(modalidad()).toBe('teclado');
    apuntar(document.body);
    tecla(document.getElementById('boton')!, 'Enter');
    expect(modalidad()).toBe('teclado');
  });

  it('modalidadDeTecla: qué indica cada tecla', () => {
    const caja = document.getElementById('caja')!;
    const sin = { ctrlKey: false, metaKey: false, altKey: false };
    expect(modalidadDeTecla({ key: 'Tab', target: caja, ...sin })).toBe('teclado');
    expect(modalidadDeTecla({ key: 'x', target: caja, ...sin })).toBeNull();
    expect(modalidadDeTecla({ key: 'x', target: document.body, ...sin })).toBe('teclado');
    expect(modalidadDeTecla({ key: 'x', target: document.body, ...sin, metaKey: true })).toBeNull();
    expect(modalidadDeTecla({ key: 'x', target: null, ...sin })).toBe('teclado');
  });

  it('dejar de vigilar quita los escuchas', () => {
    dejarDeVigilar();
    apuntar(document.body);
    expect(modalidad()).toBeUndefined();
    dejarDeVigilar = () => {};
  });
});
