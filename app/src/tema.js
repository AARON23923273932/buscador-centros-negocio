// =============================================================================
// tema.js — Botón ☀️/🌙 para cambiar entre modo claro y oscuro.
// - Si la persona nunca lo tocó, se sigue el modo del sistema (prefers-color-scheme).
// - Al pulsarlo, la elección se guarda en este navegador (localStorage) y se aplica con
//   <html data-tema="claro|oscuro">. public/tema-inicial.js la aplica antes de pintar.
// - <html data-tema-efectivo> indica el modo que se ve ahora (lo usa el CSS del ícono).
// =============================================================================

export const CLAVE_TEMA = 'buscador-cn.tema';

/** Modo que se ve: la elección guardada, o el del sistema si no hay elección. */
export function temaEfectivo(elegido, sistemaOscuro) {
  if (elegido === 'claro' || elegido === 'oscuro') return elegido;
  return sistemaOscuro ? 'oscuro' : 'claro';
}

/** Modo al que lleva el botón. */
export function temaContrario(tema) {
  return tema === 'oscuro' ? 'claro' : 'oscuro';
}

function leerGuardado() {
  try {
    return localStorage.getItem(CLAVE_TEMA);
  } catch {
    return null;
  }
}

function guardar(tema) {
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch {
    /* Sin localStorage: el cambio vale hasta recargar. */
  }
}

/** Conecta el botón #btn-tema. */
export function iniciarTema(doc = document, win = window) {
  const raiz = doc.documentElement;
  const boton = doc.getElementById('btn-tema');
  const consulta = win.matchMedia?.('(prefers-color-scheme: dark)');

  const pintar = () => {
    const efectivo = temaEfectivo(raiz.getAttribute('data-tema'), consulta?.matches);
    raiz.setAttribute('data-tema-efectivo', efectivo);
    if (boton) {
      const texto = temaContrario(efectivo) === 'oscuro' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
      boton.setAttribute('aria-label', texto);
      boton.title = texto;
    }
  };

  const guardado = leerGuardado();
  if (guardado === 'claro' || guardado === 'oscuro') raiz.setAttribute('data-tema', guardado);
  pintar();

  boton?.addEventListener('click', () => {
    const nuevo = temaContrario(raiz.getAttribute('data-tema-efectivo'));
    raiz.setAttribute('data-tema', nuevo);
    guardar(nuevo);
    pintar();
  });
  // Si la persona no eligió nada y cambia el modo del sistema, el ícono se actualiza.
  consulta?.addEventListener?.('change', pintar);
}
