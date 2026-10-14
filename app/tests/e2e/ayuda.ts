// Ayudas comunes de las pruebas en navegador (Playwright).
import { expect, type Page } from '@playwright/test';
import * as XLSX from 'xlsx/xlsx.mjs';

/** Junta errores de la página (incluye violaciones de la política de seguridad CSP). */
export function vigilarErrores(page: Page) {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`console: ${m.text()}`);
  });
  return errores;
}

/** Reemplaza el Excel de ejemplo por uno armado en la prueba. */
export async function usarExcel(page: Page, matriz: unknown[][]) {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(matriz), 'Hoja1');
  const cuerpo = Buffer.from(XLSX.write(libro, { type: 'array', bookType: 'xlsx' }));
  await page.route('**/datos/centros-ejemplo.xlsx', (ruta) =>
    ruta.fulfill({ body: cuerpo, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  );
}

/**
 * Abre una dirección de la app y espera a que el Excel se haya leído: en las listas (/, /ordenes, /centros),
 * al contador; en el detalle de un centro (/centros/<código>), a la ficha o al mensaje "No se encontró…"
 * (el título del detalle aparece antes de leer el Excel: no sirve para esperar).
 */
export async function abrir(page: Page, ruta = '/') {
  await page.goto(ruta);
  if (/^\/centros\/[^?#]/i.test(ruta)) {
    await expect(page.locator('#ficha-centro, #centro-no-encontrado')).toBeVisible();
  } else {
    await expect(page.locator('#contador')).toContainText(/Mostrando|Sin /);
  }
}
