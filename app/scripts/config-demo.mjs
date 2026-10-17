import { readFileSync } from 'node:fs';

/**
 * @typedef {Record<string, unknown> & {
 *   modo: 'demo',
 *   datos: Record<string, unknown> & { fuente: 'archivo-local', rutaLocal: unknown },
 * }} ConfigDemo
 */

/**
 * @param {unknown} cfg
 * @returns {ConfigDemo}
 */
export function configParaDemo(cfg) {
  const copia = /** @type {Record<string, unknown>} */ (structuredClone(cfg && typeof cfg === 'object' ? cfg : {}));
  const datos = /** @type {Record<string, unknown>} */ (copia.datos && typeof copia.datos === 'object' ? copia.datos : {});
  return {
    ...copia,
    modo: 'demo',
    datos: { ...datos, fuente: 'archivo-local', rutaLocal: datos.rutaLocal || 'datos/centros-ejemplo.xlsx' },
  };
}

/**
 * @param {string} rutaConfig
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
