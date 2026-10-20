import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { copiarSinTemporales } from './archivos-temporales.mjs';
import { quitarDatosDeEjemplo, revisarRedirecciones } from './limpiar-dist.mjs';

const app = resolve(import.meta.dirname, '..');
const destino = resolve(app, '..', 'publicar');

execSync('npm run build', { cwd: app, stdio: 'inherit' });
rmSync(destino, { recursive: true, force: true });
const omitidos = copiarSinTemporales(resolve(app, 'dist'), destino);

revisarRedirecciones(destino);
quitarDatosDeEjemplo(destino);
const config = JSON.parse(readFileSync(resolve(destino, 'config.json'), 'utf8'));
console.log(`\nListo: ${destino}`);
console.log(`Modo: ${config.modo} · Fuente de datos: ${config.datos.fuente} · Permisos: ${config.microsoft?.scopes?.join(', ')}`);
if (omitidos.length) {
  console.warn(
    `Se dejaron afuera ${omitidos.length} archivo(s) temporal(es) de Office (~$…): ${omitidos.join(', ')}. ` +
      'Aparecen cuando el Excel de ejemplo está abierto: ciérralo.',
  );
}
console.log('Netlify publica solo desde GitHub (rama main). Esta carpeta sirve para revisar la compilación o para una publicación manual.');
