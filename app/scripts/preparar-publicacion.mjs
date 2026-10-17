import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { copiarSinTemporales } from './archivos-temporales.mjs';

const app = resolve(import.meta.dirname, '..');
const destino = resolve(app, '..', 'publicar');

execSync('npm run build', { cwd: app, stdio: 'inherit' });
rmSync(destino, { recursive: true, force: true });
const omitidos = copiarSinTemporales(resolve(app, 'dist'), destino);

if (!existsSync(resolve(destino, '_redirects'))) {
  throw new Error('Falta _redirects en la carpeta "publicar" (debe venir de app/public/_redirects).');
}

const config = JSON.parse(readFileSync(resolve(destino, 'config.json'), 'utf8'));
if (config.datos?.fuente === 'graph') rmSync(resolve(destino, 'datos'), { recursive: true, force: true });
console.log(`\nListo: ${destino}`);
console.log(`Modo: ${config.modo} · Fuente de datos: ${config.datos.fuente} · Permisos: ${config.microsoft?.scopes?.join(', ')}`);
if (omitidos.length) {
  console.warn(
    `Se dejaron afuera ${omitidos.length} archivo(s) temporal(es) de Office (~$…): ${omitidos.join(', ')}. ` +
      'Aparecen cuando el Excel de ejemplo está abierto: ciérralo.',
  );
}
console.log('Siguiente paso: Netlify → Deploys → arrastrar la carpeta "publicar".');
