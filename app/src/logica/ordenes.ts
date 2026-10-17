import type { Segmento } from './filtros.ts';

const TIPO = String.raw`(?:O\.\s?|O)[CS]\.?`;
const TIPOS = String.raw`${TIPO}(?:\s*\/\s*${TIPO})?`;
const SEPARACION = String.raw`[\s:-]*(?:(?:N\.?\s*[\u00b0\u00ba]|Nro\.?|No\.?|#)[\s:-]*)?`;

const INICIO_ORDEN = new RegExp(String.raw`(?<![\p{L}\p{N}_])${TIPOS}(?=${SEPARACION}\d)`, 'giu');

const PARTES_ORDEN = new RegExp(String.raw`^(${TIPOS})${SEPARACION}(.*)$`, 'iu');

const NUMERO_ORDEN = /^[^\s,;()]+/u;

const MARCAS_TILDE = /[\u0300-\u036f]/g;

const limpiarEspacios = (texto: string): string => texto.replace(/\s+/g, ' ').trim();

function iniciosDeOrdenes(texto: string): number[] {
  return [...texto.matchAll(INICIO_ORDEN)].map((m) => m.index);
}

export function separarOrdenes(texto: string): string[] {
  const inicios = iniciosDeOrdenes(texto);
  if (inicios.length === 0) return texto ? [texto] : [];
  const cortes = inicios[0] === 0 ? inicios : [0, ...inicios];
  return cortes.map((desde, i) => limpiarEspacios(texto.slice(desde, cortes[i + 1] ?? texto.length))).filter(Boolean);
}

export function tieneVariasOrdenes(texto: string): boolean {
  return separarOrdenes(texto).length > 1;
}

const normal = (texto: string): string => limpiarEspacios(texto.normalize('NFD').replace(MARCAS_TILDE, '').toLowerCase());

export function clavesDeOrdenes(texto: string): string[] {
  const inicios = iniciosDeOrdenes(texto);
  if (inicios.length === 0) {
    const clave = normal(texto);
    return clave ? [clave] : [];
  }
  return inicios.map((desde, i) => {
    const orden = texto.slice(desde, inicios[i + 1] ?? texto.length);
    const partes = PARTES_ORDEN.exec(limpiarEspacios(orden));
    const tipo = (partes?.[1] ?? '').toLowerCase().replace(/[^a-z]/g, '');
    const numero = normal(NUMERO_ORDEN.exec(partes?.[2] ?? '')?.[0] ?? '').replace(/[^a-z0-9]/g, '');
    return `${tipo}${numero}`;
  });
}

export function segmentosPorLinea(lineas: readonly string[], segmentos: readonly Segmento[]): Segmento[][] {
  const resultado: Segmento[][] = lineas.map(() => []);
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
