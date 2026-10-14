// Compila la app y deja una copia lista para subir a Netlify en ../publicar
// (la carpeta que se arrastra en Netlify → Deploys). Uso: npm run preparar-publicacion
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { copiarSinTemporales } from './archivos-temporales.mjs';

const app = resolve(import.meta.dirname, '..');
const destino = resolve(app, '..', 'publicar');

execSync('npm run build', { cwd: app, stdio: 'inherit' }); // execSync siempre usa la terminal (cmd.exe en Windows)
rmSync(destino, { recursive: true, force: true });
// Sin los archivos temporales de Office (~$…): llevan el nombre del usuario de Windows.
const omitidos = copiarSinTemporales(resolve(app, 'dist'), destino);

// Sin _redirects, Netlify respondería "Page not found" al abrir o recargar /centros/A2338PY01 (rutas de React Router).
if (!existsSync(resolve(destino, '_redirects'))) {
  throw new Error('Falta _redirects en la carpeta "publicar" (debe venir de app/public/_redirects).');
}

const config = JSON.parse(readFileSync(resolve(destino, 'config.json'), 'utf8'));
// Con el Excel real (fuente graph) el Excel de ejemplo no se usa: no se publica.
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
