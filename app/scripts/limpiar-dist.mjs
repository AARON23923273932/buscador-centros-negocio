import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** @param {string} carpeta @returns {boolean} */
export function quitarDatosDeEjemplo(carpeta) {
  const config = JSON.parse(readFileSync(resolve(carpeta, 'config.json'), 'utf8'));
  if (config.datos?.fuente !== 'graph') return false;
  rmSync(resolve(carpeta, 'datos'), { recursive: true, force: true });
  return true;
}

/** @param {string} carpeta */
export function revisarRedirecciones(carpeta) {
  if (!existsSync(resolve(carpeta, '_redirects'))) {
    throw new Error(`Falta _redirects en "${carpeta}" (debe venir de app/public/_redirects).`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dist = resolve(import.meta.dirname, '..', 'dist');
  revisarRedirecciones(dist);
  const quitado = quitarDatosDeEjemplo(dist);
  console.log(quitado ? 'dist/: sin el Excel de ejemplo (la app lee el Excel real).' : 'dist/: modo demo, se mantiene el Excel de ejemplo.');
}
