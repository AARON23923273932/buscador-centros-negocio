// Modo demo EN LA COMPUTADORA, sin tocar app/public/config.json (que ya tiene los valores de producción).
//
//   npm run dev:demo      → http://localhost:5173 sin inicio de sesión y con el Excel de ejemplo
//   npm run preview:demo  → lo mismo con la versión compilada (dist/), en http://localhost:4173
//
// Cómo funciona: el servidor de Vite responde a "config.json" con una copia de public/config.json
// cambiada a "modo": "demo" y "fuente": "archivo-local". El archivo real no se modifica, así que
// no hay riesgo de publicar la configuración de demostración por olvido.
// (Los tipos van en comentarios JSDoc: "npm run typecheck" también revisa estos scripts.)
import { readFileSync } from 'node:fs';

/**
 * @typedef {Record<string, unknown> & {
 *   modo: 'demo',
 *   datos: Record<string, unknown> & { fuente: 'archivo-local', rutaLocal: unknown },
 * }} ConfigDemo
 */

/**
 * Copia de la configuración con lo mínimo para el modo demo (se conservan columnas, columnas ocultas, etc.).
 * @param {unknown} cfg  el contenido de config.json (puede traer cualquier cosa)
 * @returns {ConfigDemo}
 */
export function configParaDemo(cfg) {
  // (Un objeto de JSON se puede ver como "clave → valor".)
  const copia = /** @type {Record<string, unknown>} */ (structuredClone(cfg && typeof cfg === 'object' ? cfg : {}));
  const datos = /** @type {Record<string, unknown>} */ (copia.datos && typeof copia.datos === 'object' ? copia.datos : {});
  return {
    ...copia,
    modo: 'demo',
    datos: { ...datos, fuente: 'archivo-local', rutaLocal: datos.rutaLocal || 'datos/centros-ejemplo.xlsx' },
  };
}

/**
 * Plugin de Vite: en "npm run dev:demo" / "npm run preview:demo" sirve la configuración de demo.
 * @param {string} rutaConfig  ruta de public/config.json
 * @returns {import('vite').Plugin}
 */
export function pluginConfigDemo(rutaConfig) {
  /** @type {import('vite').Connect.NextHandleFunction} */
  const responder = (req, res, next) => {
    if (!/\/config\.json(\?|$)/.test(req.url || '')) return next();
    const cfg = configParaDemo(JSON.parse(readFileSync(rutaConfig, 'utf8')));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(cfg));
  };
  // Ojo: estos ganchos NO deben devolver nada (si devuelven una función, Vite la ejecuta después como otro gancho).
  return {
    name: 'config-demo',
    configureServer(servidor) {
      servidor.middlewares.use(responder);
    },
    configurePreviewServer(servidor) {
      servidor.middlewares.use(responder);
    },
  };
}
