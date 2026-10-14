// =============================================================================
// modalidad.ts — ¿Lo último que usó la persona fue el mouse (o el dedo) o el teclado?
//
// Se guarda en <html data-modalidad="puntero|teclado"> y lo usa estilos.css: al hacer CLIC en una caja de
// texto o en un desplegable no se dibuja el anillo de foco (pedido del supervisor: "anillo solo con el
// teclado"). Hace falta porque Chromium marca esos controles con :focus-visible también con el mouse
// (en los botones y enlaces, no).
//
//   pointerdown (mouse, dedo, lápiz)                         → "puntero"
//   Tab / Shift+Tab, o una tecla fuera de una caja de texto   → "teclado"
//   o desplegable (ej. "/" para ir al buscador)
//
// Escribir dentro de una caja, o elegir con las flechas en un desplegable, NO cambia la modalidad: el anillo
// no aparece de golpe a la mitad de lo que se escribe.
// =============================================================================

export type Modalidad = 'puntero' | 'teclado';

/** Controles donde las teclas son para escribir o elegir (no para moverse por la página). */
const CAMPOS = 'input, select, textarea, [contenteditable]';

/** Qué modalidad indica una tecla pulsada (null = no cambia nada). */
export function modalidadDeTecla(ev: Pick<KeyboardEvent, 'key' | 'target' | 'ctrlKey' | 'metaKey' | 'altKey'>): Modalidad | null {
  if (ev.key === 'Tab') return 'teclado';
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return null; // atajos (Ctrl+C, Alt+←…)
  const destino = ev.target;
  if (destino instanceof Element && destino.closest(CAMPOS)) return null;
  return 'teclado';
}

/** Empieza a vigilar el mouse y el teclado. Devuelve la función para dejar de hacerlo (pruebas). */
export function vigilarModalidad(doc: Document = document): () => void {
  const raiz = doc.documentElement;
  const poner = (modalidad: Modalidad) => {
    if (raiz.dataset.modalidad !== modalidad) raiz.dataset.modalidad = modalidad;
  };
  const alApuntar = () => poner('puntero');
  const alPulsar = (ev: KeyboardEvent) => {
    const modalidad = modalidadDeTecla(ev);
    if (modalidad) poner(modalidad);
  };
  // En la fase de "captura": se entera antes que cualquier otro código (y aunque alguien detenga el evento).
  doc.addEventListener('pointerdown', alApuntar, true);
  doc.addEventListener('keydown', alPulsar, true);
  return () => {
    doc.removeEventListener('pointerdown', alApuntar, true);
    doc.removeEventListener('keydown', alPulsar, true);
  };
}
