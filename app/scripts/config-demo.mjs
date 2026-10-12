// Modo demo EN LA COMPUTADORA, sin tocar app/public/config.json (que ya tiene los valores de producción).
//
//   npm run dev:demo      → http://localhost:5173 sin inicio de sesión y con el Excel de ejemplo
//   npm run preview:demo  → lo mismo con la versión compilada (dist/), en http://localhost:4173
//
// Cómo funciona: el servidor de Vite responde a "config.json" con una copia de public/config.json
// cambiada a "modo": "demo" y "fuente": "archivo-local". El archivo real no se modifica, así que
// no hay riesgo de publicar la configuración de demostración por olvido.
import { readFileSync } from 'node:fs';

/** Copia de la configuración con lo mínimo para el modo demo (se conservan columnas, columnas ocultas, etc.). */
export function configParaDemo(cfg) {
  const copia = structuredClone(cfg && typeof cfg === 'object' ? cfg : {});
  copia.modo = 'demo';
  copia.datos = {
    ...(copia.datos || {}),
    fuente: 'archivo-local',
    rutaLocal: copia.datos?.rutaLocal || 'datos/centros-ejemplo.xlsx',
  };
  return copia;
}

/** Plugin de Vite: en "npm run dev:demo" / "npm run preview:demo" sirve la configuración de demo. */
export function pluginConfigDemo(rutaConfig) {
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
