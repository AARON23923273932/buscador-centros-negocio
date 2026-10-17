import { cpSync, readdirSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';

/**
 * @param {string} ruta
 */
export const esArchivoTemporal = (ruta) => /^(~\$|\.~lock\.)/.test(basename(String(ruta)));

/**
 * @param {string} origen
 * @param {string} destino
 * @returns {string[]}
 */
export function copiarSinTemporales(origen, destino) {
  /** @type {string[]} */
  const omitidos = [];
  cpSync(origen, destino, {
    recursive: true,
    filter: (ruta) => {
      if (!esArchivoTemporal(ruta)) return true;
      omitidos.push(ruta);
      return false;
    },
  });
  return omitidos;
}

/**
 * @param {string} carpeta
 * @returns {string[]}
 */
export function quitarTemporales(carpeta) {
  /** @type {string[]} */
  const borrados = [];
  for (const entrada of readdirSync(carpeta, { withFileTypes: true, recursive: true })) {
    if (!entrada.isFile() || !esArchivoTemporal(entrada.name)) continue;
    const ruta = join(entrada.parentPath, entrada.name);
    rmSync(ruta, { force: true });
    borrados.push(ruta);
  }
  return borrados;
}
