// =============================================================================
// ordenes.ts — Una celda de la columna de órdenes puede traer VARIAS órdenes juntas (así viene el Excel real):
//
//   "OC 3519155 OC 3519252 OC N° 3519348"  →  ["OC 3519155", "OC 3519252", "OC N° 3519348"]
//
// La tabla "Por orden", la vista "Por centro" y el detalle de un centro muestran cada orden en su propia línea
// (pedido del supervisor, 15/10/2026); el Excel exportado también (salto de línea dentro de la misma celda, ver
// exportar.ts). La búsqueda y los filtros NO cambian: siguen buscando en el texto completo de la celda.
// Funciones puras (se prueban sin navegador: tests/unit/ordenes.test.ts).
// =============================================================================

import type { Segmento } from './filtros.ts';

/**
 * Dónde empieza una orden: "OC" u "OS" como palabra completa (mayúsculas o minúsculas) seguida del número, con
 * o sin "-", ":", "N°", "Nº", "No.", "Nro." o "#" en medio:
 *   OC 3519155 · OC N° 3519348 · OC-0000098263-2025 · OS-2026-0001 · oc #12 · OC No. 8702
 *  - Palabra completa: no corta dentro de otra palabra ("ROC 12", "BLOC 5", "OC" pegado a una letra o número).
 *  - El número es obligatorio: "OS de mantenimiento" no es una orden (no se corta).
 *  - "N°" y el guion van DESPUÉS del "OC": por eso nunca se corta "OC N° 3519348" ni "OC-0000098263-2025".
 * (°: signo de grado U+00B0; º: ordinal U+00BA. Se escriben con su código para que no se confundan.)
 */
const INICIO_ORDEN = /(?<![\p{L}\p{N}_])(?:OC|OS)(?=[\s:-]*(?:(?:N\s*[\u00b0\u00ba]|Nro\.?|No\.?|#)[\s:-]*)?\d)/giu;

/** Lo que va entre "OC"/"OS" y el número (para reconocer la misma orden escrita de dos formas). */
const PARTES_ORDEN = /^(OC|OS)[\s:-]*(?:(?:N\s*[\u00b0\u00ba]|Nro\.?|No\.?|#)[\s:-]*)?(.*)$/iu;

/** Tildes "sueltas" que deja normalize('NFD') (igual que en filtros.ts). */
const MARCAS_TILDE = /[\u0300-\u036f]/g;

/** Espacios seguidos (también saltos de línea y tabulaciones) → uno solo; sin espacios al principio ni al final. */
const limpiarEspacios = (texto: string): string => texto.replace(/\s+/g, ' ').trim();

/** Posiciones del texto donde empieza cada orden (vacío si no hay ninguna). */
function iniciosDeOrdenes(texto: string): number[] {
  return [...texto.matchAll(INICIO_ORDEN)].map((m) => m.index);
}

/**
 * Separa una celda en sus órdenes, una por elemento: corta ANTES de cada "OC"/"OS" que empieza una orden y quita
 * los espacios de más. No se pierde texto: lo que haya antes de la primera orden queda como su propia línea
 * (ej. "Ver: OC 1 OC 2" → ["Ver:", "OC 1", "OC 2"]) y los signos entre órdenes quedan al final de la anterior.
 * Si no reconoce ninguna orden devuelve el texto tal cual (en una lista de un elemento; [] si está vacío).
 */
export function separarOrdenes(texto: string): string[] {
  const inicios = iniciosDeOrdenes(texto);
  if (inicios.length === 0) return texto ? [texto] : [];
  const cortes = inicios[0] === 0 ? inicios : [0, ...inicios];
  return cortes.map((desde, i) => limpiarEspacios(texto.slice(desde, cortes[i + 1] ?? texto.length))).filter(Boolean);
}

/** ¿La celda trae más de una línea al separarla? (si no, se muestra y se exporta tal cual) */
export function tieneVariasOrdenes(texto: string): boolean {
  return separarOrdenes(texto).length > 1;
}

/** Texto para comparar: minúsculas, sin tildes ni espacios de más. */
const normal = (texto: string): string => limpiarEspacios(texto.normalize('NFD').replace(MARCAS_TILDE, '').toLowerCase());

/**
 * Órdenes de una celda, listas para contarlas sin repetir ("N° de órdenes" de cada centro): una clave por orden.
 * La misma orden escrita de dos formas es UNA sola ("OC N° 3519348", "OC 3519348" y "oc-3519348" → "oc3519348").
 * Si la celda no tiene órdenes reconocibles (ej. "0004500100"), toda la celda cuenta como una (como antes).
 * Lo que va antes de la primera orden (ej. "Ver:") no es una orden y no se cuenta.
 */
export function clavesDeOrdenes(texto: string): string[] {
  const inicios = iniciosDeOrdenes(texto);
  if (inicios.length === 0) {
    const clave = normal(texto);
    return clave ? [clave] : [];
  }
  return inicios.map((desde, i) => {
    const orden = texto.slice(desde, inicios[i + 1] ?? texto.length);
    const partes = PARTES_ORDEN.exec(limpiarEspacios(orden));
    const tipo = (partes?.[1] ?? '').toLowerCase();
    const numero = normal(partes?.[2] ?? '').replace(/[^a-z0-9]/g, '');
    return `${tipo}${numero}`;
  });
}

/**
 * Reparte el resaltado del buscador entre las líneas de una celda con varias órdenes.
 * @param lineas     lo que devuelve separarOrdenes()
 * @param segmentos  segmentosResaltado() del texto lineas.join(' ') (así una palabra buscada que cruza de una
 *                   orden a la siguiente también se resalta, en las dos líneas)
 * @returns los trozos de cada línea (los espacios que unían las líneas no se dibujan: ahí va el salto de línea)
 */
export function segmentosPorLinea(lineas: readonly string[], segmentos: readonly Segmento[]): Segmento[][] {
  const resultado: Segmento[][] = lineas.map(() => []);
  // Dónde empieza cada línea dentro del texto unido (separadas por un espacio).
  const inicios: number[] = [];
  let posicion = 0;
  for (const linea of lineas) {
    inicios.push(posicion);
    posicion += linea.length + 1;
  }
  let cursor = 0;
  for (const segmento of segmentos) {
    const desde = cursor;
    const hasta = cursor + segmento.texto.length;
    cursor = hasta;
    lineas.forEach((linea, i) => {
      const inicio = inicios[i] ?? 0;
      const ini = Math.max(desde, inicio);
      const fin = Math.min(hasta, inicio + linea.length);
      if (ini < fin) resultado[i]?.push({ texto: segmento.texto.slice(ini - desde, fin - desde), marcado: segmento.marcado });
    });
  }
  return resultado;
}
