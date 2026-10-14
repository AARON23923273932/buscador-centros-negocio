// Configuración FIJA para las pruebas en navegador (modo demo + Excel de ejemplo).
//
// Las pruebas NO leen app/public/config.json: ese archivo se cambia a los valores de producción
// (modo "microsoft", enlace del Excel real…) y las pruebas tienen que seguir pasando igual.
// Cada prueba "intercepta" el pedido de config.json y responde con esta configuración.
import type { BrowserContext, Page } from '@playwright/test';
import { CONFIG_POR_DEFECTO, type Config } from '../../src/logica/config.ts';

const PRUEBAS: Config = {
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
};
export const CONFIG_PRUEBAS: Readonly<Config> = Object.freeze(PRUEBAS);

/** Cambios para una prueba: cualquier valor (también del tipo equivocado, para probar los mensajes). */
export type CambiosConfig = Record<string, unknown>;

/** Hace que la página reciba CONFIG_PRUEBAS (con cambios opcionales) en vez de config.json. */
export async function usarConfigPruebas(page: Page | BrowserContext, cambios: CambiosConfig = {}): Promise<Record<string, unknown>> {
  const config: Record<string, unknown> = structuredClone(CONFIG_PRUEBAS);
  for (const [k, v] of Object.entries(cambios)) {
    config[k] = typeof v === 'object' && !Array.isArray(v) && v !== null ? { ...(config[k] as object), ...v } : v;
  }
  await page.route('**/config.json', (ruta) => ruta.fulfill({ json: config }));
  return config;
}
