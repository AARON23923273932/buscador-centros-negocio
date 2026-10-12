// Configuración FIJA para las pruebas en navegador (modo demo + Excel de ejemplo).
//
// Las pruebas NO leen app/public/config.json: ese archivo se cambia a los valores de producción
// (modo "microsoft", enlace del Excel real…) y las pruebas tienen que seguir pasando igual.
// Cada prueba "intercepta" el pedido de config.json y responde con esta configuración.
import { CONFIG_POR_DEFECTO } from '../../src/config.js';

export const CONFIG_PRUEBAS = Object.freeze({
  ...structuredClone(CONFIG_POR_DEFECTO),
  modo: 'demo',
  datos: {
    ...structuredClone(CONFIG_POR_DEFECTO.datos),
    fuente: 'archivo-local',
    rutaLocal: 'datos/centros-ejemplo.xlsx',
    hoja: '',
    filaEncabezado: null,
  },
  autoActualizarMinutos: 10,
  filasPorPagina: 50,
});

/** Hace que la página reciba CONFIG_PRUEBAS (con cambios opcionales) en vez de config.json. */
export async function usarConfigPruebas(page, cambios = {}) {
  const config = structuredClone(CONFIG_PRUEBAS);
  for (const [k, v] of Object.entries(cambios)) {
    config[k] = typeof v === 'object' && !Array.isArray(v) && v !== null ? { ...config[k], ...v } : v;
  }
  await page.route('**/config.json', (ruta) => ruta.fulfill({ json: config }));
  return config;
}
