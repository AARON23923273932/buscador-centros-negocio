// Pruebas de punta a punta en modo demo: abren la app en Chromium y la usan como una persona.
// Usan su PROPIA configuración (config-pruebas.ts), no app/public/config.json: así siguen
// funcionando cuando ese archivo ya tiene los valores de producción.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import * as XLSX from 'xlsx/xlsx.mjs';
import { usarConfigPruebas, type CambiosConfig } from './config-pruebas.ts';

const TOTAL_FILAS = 80;

// Todas las pestañas de la prueba reciben la configuración de pruebas.
test.beforeEach(async ({ context }) => {
  await usarConfigPruebas(context);
});

const normalizar = (s: string) =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Junta errores de la página (incluye violaciones de la política de seguridad CSP). */
function vigilarErrores(page: Page) {
  const errores: string[] = [];
  page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errores.push(`console: ${m.text()}`);
  });
  return errores;
}

/** Configuración de pruebas con cambios (sin tocar el archivo real). Tiene prioridad sobre la de beforeEach. */
const usarConfig = (page: Page, cambios: CambiosConfig) => usarConfigPruebas(page, cambios);

/** Reemplaza el Excel de ejemplo por uno armado en la prueba. */
async function usarExcel(page: Page, matriz: unknown[][]) {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(matriz), 'Hoja1');
  const cuerpo = Buffer.from(XLSX.write(libro, { type: 'array', bookType: 'xlsx' }));
  await page.route('**/datos/centros-ejemplo.xlsx', (ruta) =>
    ruta.fulfill({ body: cuerpo, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  );
}

async function abrir(page: Page, ruta = '/') {
  await page.goto(ruta);
  await expect(page.locator('#contador')).toContainText(/Mostrando|Sin /);
}

const filas = (page: Page) => page.locator('#tabla-resultados > tbody > tr:not(.fila-vacia)');
const celdasDeColumna = (page: Page, n: number) =>
  page.locator(`#tabla-resultados > tbody > tr:not(.fila-vacia) > td:nth-child(${n})`).allInnerTexts();

test.describe('Buscador de centros de negocio (modo demo)', () => {
  test('carga el Excel de ejemplo sin errores ni inicio de sesión', async ({ page }) => {
    const errores = vigilarErrores(page);
    await abrir(page);
    await expect(page.locator('#aviso-demo')).toBeVisible();
    await expect(page.locator('#insignia-demo')).toHaveText('Modo demostración');
    await expect(page.locator('#contador')).toHaveText(`Mostrando 1–50 de ${TOTAL_FILAS} resultados (de ${TOTAL_FILAS} en total)`);
    await expect(page.locator('#texto-actualizado')).toContainText(/Datos actualizados a las \d{2}:\d{2}/);
    await expect(filas(page)).toHaveCount(50);
    await expect(page.getByRole('button', { name: /^Código/ })).toBeVisible();
    await expect(page.locator('#aviso-columnas')).toBeHidden();
    // Los códigos de orden conservan sus ceros a la izquierda.
    expect((await celdasDeColumna(page, 4)).some((t) => /^000\d+$/.test(t))).toBe(true);
    // La política de seguridad (CSP) está activa en la versión compilada.
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    expect(errores).toEqual([]);
  });

  test('botón ☀️/🌙: cambia entre claro y oscuro y lo recuerda al recargar', async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page);
    const raiz = page.locator('html');
    const fondo = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const boton = page.getByRole('button', { name: 'Cambiar a modo oscuro' });
    await expect(raiz).toHaveAttribute('data-tema-efectivo', 'claro');
    const fondoClaro = await fondo();

    await boton.click();
    await expect(raiz).toHaveAttribute('data-tema', 'oscuro');
    await expect(page.getByRole('button', { name: 'Cambiar a modo claro' })).toBeVisible();
    expect(await fondo()).not.toBe(fondoClaro);

    // Se recuerda al recargar, aunque el sistema esté en claro.
    await page.reload();
    await expect(raiz).toHaveAttribute('data-tema', 'oscuro');
    await expect(raiz).toHaveAttribute('data-tema-efectivo', 'oscuro');

    // Y vuelve a claro aunque el sistema esté en oscuro.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.getByRole('button', { name: 'Cambiar a modo claro' }).click();
    await expect(raiz).toHaveAttribute('data-tema-efectivo', 'claro');
    expect(await fondo()).toBe(fondoClaro);
    expect(errores).toEqual([]);
  });

  test('buscador: sin tildes, varias palabras y resaltado', async ({ page }) => {
    const errores = vigilarErrores(page);
    await abrir(page);
    await page.getByLabel('Buscar', { exact: true }).fill('electrico');
    await expect(page.locator('#contador')).not.toContainText(`de ${TOTAL_FILAS} resultados`);
    const textos = await filas(page).allInnerTexts();
    expect(textos.length).toBeGreaterThan(0);
    for (const t of textos) expect(normalizar(t)).toContain('electrico');
    await expect(page.locator('#tabla-resultados mark').first()).toHaveText(/eléctrico/i);

    await page.getByLabel('Buscar', { exact: true }).fill('MANTENIMIENTO  local  compra');
    await expect(async () => {
      const t2 = await filas(page).allInnerTexts();
      expect(t2.length).toBeGreaterThan(0);
      for (const t of t2) {
        const n = normalizar(t);
        expect(n).toContain('mantenimiento');
        expect(n).toContain('local');
        expect(n).toContain('compra');
      }
    }).toPass();

    // Código escrito sin guion: lo encuentra Y lo resalta.
    await page.getByLabel('Buscar', { exact: true }).fill('cn0005');
    await expect(page.locator('#contador')).toContainText('de 3 resultados');
    await expect(page.locator('#tabla-resultados mark').first()).toHaveText('CN-0005');

    await page.getByLabel('Buscar', { exact: true }).fill('palabraquenoexiste');
    await expect(page.locator('.fila-vacia')).toContainText('No hay resultados');
    await page.getByRole('button', { name: 'Borrar búsqueda' }).click();
    await expect(page.locator('#contador')).toContainText(`de ${TOTAL_FILAS} resultados`);
    expect(errores).toEqual([]);
  });

  test('filtros por cliente, código, orden y tipo; "Limpiar filtros"', async ({ page }) => {
    await abrir(page);
    const cliente = page.getByLabel('Cliente', { exact: true });
    const opciones = await cliente.locator('option').allInnerTexts();
    expect(opciones[0]).toBe('Todos');
    expect(opciones.slice(1)).toEqual([...opciones.slice(1)].sort((a, b) => a.localeCompare(b, 'es')));
    expect(opciones).toContain('Inmobiliaria Demo Ñandú E.I.R.L.');

    await cliente.selectOption('Cliente Demo B S.A.');
    await expect(async () => {
      const clientes = await celdasDeColumna(page, 3);
      expect(clientes.length).toBeGreaterThan(0);
      expect(new Set(clientes)).toEqual(new Set(['Cliente Demo B S.A.']));
    }).toPass();

    await page.getByLabel('Tipo de orden').selectOption('Servicio');
    await expect(async () => {
      const tipos = await celdasDeColumna(page, 5);
      expect(new Set(tipos)).toEqual(new Set(['Servicio']));
    }).toPass();

    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page.locator('#contador')).toContainText(`de ${TOTAL_FILAS} resultados`);
    await expect(cliente).toHaveValue('');

    await page.getByLabel('Código', { exact: true }).fill('CN-001');
    await expect(async () => {
      const codigos = await celdasDeColumna(page, 1);
      expect(codigos.length).toBeGreaterThan(0);
      for (const c of codigos) expect(c).toMatch(/^CN-001\d$/);
    }).toPass();

    await page.getByLabel('Código', { exact: true }).fill('');
    await page.getByLabel('Orden de compra / servicio').fill('OS-');
    await expect(async () => {
      const ordenes = await celdasDeColumna(page, 4);
      expect(ordenes.length).toBeGreaterThan(0);
      for (const o of ordenes) expect(o).toMatch(/^OS-/);
    }).toPass();

    await page.getByLabel('Descripción', { exact: true }).fill('fibra');
    await expect(async () => {
      for (const d of await celdasDeColumna(page, 2)) expect(normalizar(d)).toContain('fibra');
    }).toPass();
  });

  test('"Limpiar filtros" con el teclado: el foco pasa al buscador (no se pierde)', async ({ page }) => {
    await abrir(page);
    await page.getByLabel('Código', { exact: true }).fill('cn');
    await expect(page.getByRole('button', { name: 'Limpiar filtros' })).toBeEnabled();
    await page.getByRole('button', { name: 'Limpiar filtros' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#contador')).toContainText(`de ${TOTAL_FILAS} resultados`);
    await expect(page.getByRole('button', { name: 'Limpiar filtros' })).toBeDisabled();
    await expect(page.getByLabel('Buscar', { exact: true })).toBeFocused();
  });

  test('vista "Por centro": el filtro Descripción se resalta en la fila del centro', async ({ page }) => {
    await abrir(page, '/?desc=fibra&vista=centro');
    await expect(page.locator('.fila-centro').first()).toBeVisible();
    const filasCentro = await page.locator('.fila-centro').count();
    await expect(page.locator('.fila-centro mark')).toHaveCount(filasCentro);
    await expect(page.locator('.fila-centro mark').first()).toHaveText(/fibra/i);
  });

  test('la búsqueda queda en la URL y el enlace se puede compartir', async ({ page, context }) => {
    await abrir(page);
    await page.getByLabel('Buscar', { exact: true }).fill('cableado');
    await page.getByLabel('Cliente', { exact: true }).selectOption({ index: 1 });
    await page.getByRole('radio', { name: 'Por centro de negocio' }).check();
    await expect(page).toHaveURL(/q=cableado/);
    await expect(page).toHaveURL(/vista=centro/);
    await expect(page).toHaveURL(/cliente=/);
    const enlace = page.url();
    const valorCliente = await page.getByLabel('Cliente', { exact: true }).inputValue();

    const otra = await context.newPage();
    await abrir(otra, enlace);
    await expect(otra.getByLabel('Buscar', { exact: true })).toHaveValue('cableado');
    await expect(otra.getByLabel('Cliente', { exact: true })).toHaveValue(valorCliente);
    await expect(otra.locator('input[name="vista"][value="centro"]')).toBeChecked();
    await expect(otra.locator('#contador')).toContainText('centro');
  });

  test('ordenar al hacer clic en el encabezado (asc/desc, aria-sort)', async ({ page }) => {
    await abrir(page);
    const thCodigo = page.locator('#tabla-resultados thead th').first();
    await expect(thCodigo).toHaveAttribute('aria-sort', 'none');

    await page.getByRole('button', { name: /^Código/ }).click();
    await expect(thCodigo).toHaveAttribute('aria-sort', 'ascending');
    expect((await celdasDeColumna(page, 1))[0]).toBe('CN-0001');

    await page.getByRole('button', { name: /^Código/ }).click();
    await expect(thCodigo).toHaveAttribute('aria-sort', 'descending');
    const desc = await celdasDeColumna(page, 1);
    expect(desc[0] > 'CN-0030').toBe(true);
    // El foco se queda en el botón para poder seguir con el teclado.
    await expect(page.getByRole('button', { name: /^Código/ })).toBeFocused();

    // Fechas: orden por fecha real (dd/mm/aaaa), no alfabético.
    await page.getByRole('button', { name: /^Fecha de creación/ }).click();
    const fechas = (await celdasDeColumna(page, 6)).filter(Boolean).map((t) => t.split('/').reverse().join(''));
    expect(fechas.length).toBeGreaterThan(0);
    expect(fechas).toEqual([...fechas].sort());
    await expect(page).toHaveURL(/ord=/);
  });

  test('paginación y filas por página', async ({ page }) => {
    await abrir(page);
    await page.getByLabel('Filas por página').selectOption('25');
    await expect(page.locator('#contador')).toHaveText(`Mostrando 1–25 de ${TOTAL_FILAS} resultados (de ${TOTAL_FILAS} en total)`);
    await expect(filas(page)).toHaveCount(25);
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    await expect(page.locator('#contador')).toContainText('Mostrando 26–50');
    await page.getByRole('button', { name: 'Última página' }).click();
    await expect(page.locator('#contador')).toContainText(`Mostrando 76–${TOTAL_FILAS}`);
    await expect(page.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
    await expect(page.locator('.pagina-actual')).toHaveText('Página 4 de 4');
    await page.getByRole('button', { name: 'Primera página' }).click();
    await expect(page.locator('#contador')).toContainText('Mostrando 1–25');
  });

  test('paginación con teclado: al llegar a la última página se ve dónde quedó el foco', async ({ page }) => {
    await abrir(page);
    await page.getByLabel('Filas por página').selectOption('50');
    const siguiente = page.getByRole('button', { name: 'Página siguiente' });
    await siguiente.focus();
    await page.keyboard.press('Enter'); // página 2 de 2: "Siguiente" queda desactivado
    await expect(page.locator('#contador')).toContainText(`Mostrando 51–${TOTAL_FILAS}`);
    const actual = page.locator('.pagina-actual');
    await expect(actual).toBeFocused();
    const contorno = await actual.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(contorno).not.toBe('none');
  });

  test('"Saltar a la paginación" evita recorrer con Tab todos los botones de la tabla', async ({ page }) => {
    await abrir(page);
    await page.getByRole('button', { name: 'Exportar a Excel' }).focus();
    await page.keyboard.press('Tab');
    const saltar = page.getByRole('button', { name: 'Saltar a la paginación' });
    await expect(saltar).toBeFocused();
    await expect(saltar).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Página siguiente' })).toBeFocused();
  });

  test('vista "Por centro de negocio": una fila por centro que se expande', async ({ page }) => {
    await abrir(page);
    await page.getByRole('radio', { name: 'Por centro de negocio' }).check();
    await expect(page.locator('#contador')).toContainText('centros (de 37 en total)');
    const primero = page.locator('.btn-expandir').first();
    await expect(primero).toHaveAttribute('aria-expanded', 'false');
    const cantidad = Number(await page.locator('.fila-centro').first().locator('.insignia').innerText());
    expect(cantidad).toBeGreaterThan(0);

    await primero.click();
    await expect(page.locator('.btn-expandir').first()).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.fila-detalle .tabla-anidada tbody tr')).toHaveCount(cantidad);

    // Ordenar por N° de órdenes (desc): el primero tiene más órdenes.
    await page.getByRole('button', { name: /^N° de órdenes/ }).click();
    await page.getByRole('button', { name: /^N° de órdenes/ }).click();
    const conteos = (await page.locator('.fila-centro .insignia').allInnerTexts()).map(Number);
    expect(conteos).toEqual([...conteos].sort((a, b) => b - a));

    // Teclado: Enter sobre el botón de la fila abre/cierra.
    const clave = await page.locator('.btn-expandir[aria-expanded="false"]').first().getAttribute('data-grupo');
    const boton = page.locator(`.btn-expandir[data-grupo="${clave}"]`);
    await boton.focus();
    await page.keyboard.press('Enter');
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    await expect(boton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
  });

  test('exportar a Excel lo filtrado', async ({ page }) => {
    await abrir(page);
    await page.getByLabel('Tipo de orden').selectOption('Servicio');
    await expect(page.locator('#contador')).not.toContainText(`de ${TOTAL_FILAS} resultados`);
    const textoContador = await page.locator('#contador').innerText();
    const esperadas = Number(/de (\d+) resultados/.exec(textoContador)?.[1]);

    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exportar a Excel' }).click(),
    ]);
    expect(descarga.suggestedFilename()).toMatch(/^centros-de-negocio_\d{4}-\d{2}-\d{2}_\d{4}\.xlsx$/);
    const libro = XLSX.read(readFileSync(await descarga.path()), { type: 'buffer' });
    const matriz = XLSX.utils.sheet_to_json<unknown[]>(libro.Sheets[libro.SheetNames[0]], { header: 1 });
    expect(matriz[0]).toContain('Código');
    expect(matriz.length - 1).toBe(esperadas);
    const iTipo = matriz[0].indexOf('Tipo de orden');
    for (const fila of matriz.slice(1)) expect(fila[iTipo]).toBe('Servicio');
    await expect(page.locator('#aviso-flotante')).toContainText('Se descargó');

    // Monto y Moneda NO se exportan (columnas ocultas); Estado sí.
    expect(matriz[0]).not.toContain('Monto');
    expect(matriz[0]).not.toContain('Moneda');
    expect(matriz[0]).toContain('Estado');
    expect(matriz.flat().some((v) => /^(PEN|USD)$/.test(String(v)))).toBe(false);

    // Fechas como fecha de Excel (se pueden ordenar y filtrar en Excel).
    const hoja = XLSX.read(readFileSync(await descarga.path()), { type: 'buffer', cellNF: true }).Sheets['Órdenes'];
    const datos = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: true });
    const iFecha = datos[0].indexOf('Fecha de creación');
    const celdaFecha = hoja[XLSX.utils.encode_cell({ r: 1, c: iFecha })];
    expect(celdaFecha.t).toBe('n');
    expect(XLSX.SSF.is_date(celdaFecha.z)).toBe(true);
  });

  test('Monto y Moneda no aparecen (ni se buscan); "Columnas detectadas" dice cuáles se ocultaron', async ({ page }) => {
    const errores = vigilarErrores(page);
    await abrir(page);
    const titulos = await page.locator('#tabla-resultados thead th').allInnerTexts();
    expect(titulos.map((t) => t.replace(/[↕▲▼]/g, '').trim())).toEqual([
      'Código',
      'Descripción del centro de negocio',
      'Cliente',
      'N° Orden',
      'Tipo de orden',
      'Fecha de creación',
      'Estado',
    ]);
    await expect(page.locator('#tabla-resultados')).not.toContainText('PEN');
    await expect(page.locator('#tabla-resultados')).not.toContainText('USD');

    // Lo que hay en una columna oculta no se encuentra con el buscador.
    await page.getByLabel('Buscar', { exact: true }).fill('usd');
    await expect(page.locator('.fila-vacia')).toContainText('No hay resultados');

    // Tampoco en la vista por centro.
    await page.getByRole('button', { name: 'Borrar búsqueda' }).click();
    await page.getByRole('radio', { name: 'Por centro de negocio' }).check();
    await page.locator('.btn-expandir').first().click();
    const anidada = await page.locator('.fila-detalle .tabla-anidada thead th').allInnerTexts();
    expect(anidada).not.toContain('Monto');
    expect(anidada).not.toContain('Moneda');
    expect(anidada).toContain('Estado');

    await page.locator('.detalles-columnas summary').click();
    await expect(page.locator('#info-columnas')).toContainText('Columnas ocultas (no se muestran, no se buscan ni se exportan): Monto (G), Moneda (H)');
    await expect(page.locator('#info-columnas')).toContainText('Estado');
    // En modo demo no hay ubicación de SharePoint que mostrar.
    await expect(page.locator('#info-columnas .ubicacion-excel')).toHaveCount(0);
    expect(errores).toEqual([]);
  });

  test('filtro "Estado": desplegable con las opciones del Excel, en la URL, se limpia y se exporta', async ({ page, context }) => {
    await abrir(page);
    const estado = page.getByLabel('Estado', { exact: true });
    await expect(estado).toBeVisible();
    expect(await estado.evaluate((el) => el.tagName)).toBe('SELECT');
    expect(await estado.locator('option').allInnerTexts()).toEqual(['Todos', 'Abierta', 'Cerrada', 'En ejecución', 'Sin orden aún']);
    // "Tipo de orden" también es un desplegable.
    expect(await page.getByLabel('Tipo de orden').evaluate((el) => el.tagName)).toBe('SELECT');

    await estado.selectOption('Cerrada');
    await expect(page.locator('#contador')).toContainText('de 35 resultados');
    expect(new Set(await celdasDeColumna(page, 7))).toEqual(new Set(['Cerrada']));
    await expect(page).toHaveURL(/estado=Cerrada/);

    // Se combina con los otros desplegables.
    await page.getByLabel('Tipo de orden').selectOption('Servicio');
    await expect(page.locator('#contador')).toContainText('de 18 resultados');

    // Exportar respeta el filtro.
    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exportar a Excel' }).click(),
    ]);
    const libro = XLSX.read(readFileSync(await descarga.path()), { type: 'buffer' });
    const matriz = XLSX.utils.sheet_to_json<unknown[]>(libro.Sheets['Órdenes'], { header: 1 });
    const iEstado = matriz[0].indexOf('Estado');
    expect(matriz.length - 1).toBe(18);
    for (const fila of matriz.slice(1)) expect(fila[iEstado]).toBe('Cerrada');

    // El enlace compartido abre con el mismo filtro.
    const otra = await context.newPage();
    await abrir(otra, page.url());
    await expect(otra.getByLabel('Estado', { exact: true })).toHaveValue('Cerrada');
    await expect(otra.locator('#contador')).toContainText('de 18 resultados');
    await otra.close();

    // "Limpiar filtros" también lo borra.
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(estado).toHaveValue('');
    await expect(page.locator('#contador')).toContainText(`de ${TOTAL_FILAS} resultados`);
    await expect(page).not.toHaveURL(/estado=/);

    // Vista por centro: cada orden muestra su estado.
    await estado.selectOption('Abierta');
    await page.getByRole('radio', { name: 'Por centro de negocio' }).check();
    await page.locator('.btn-expandir').first().click();
    const detalle = page.locator('.fila-detalle .tabla-anidada');
    await expect(detalle.locator('thead th').last()).toHaveText('Estado');
    for (const t of await detalle.locator('tbody td:last-child').allInnerTexts()) expect(t).toBe('Abierta');
  });

  test('Excel sin columna de estado: el filtro "Estado" no aparece (no es obligatorio)', async ({ page }) => {
    await usarExcel(page, [
      ['Código', 'Descripción', 'Cliente', 'Orden de compra'],
      ['CN-0001', 'Demo uno', 'Cliente Demo A', 'OC-1'],
    ]);
    await abrir(page, '/?estado=Abierta');
    await expect(page.locator('#campo-estado')).toBeHidden();
    await expect(page.locator('#aviso-columnas')).toBeHidden();
    // Un estado que venía en el enlace no deja la tabla vacía.
    await expect(page.locator('#contador')).toHaveText('Mostrando 1–1 de 1 resultado (de 1 en total)');
  });

  test('columna Estado sin ningún valor: el filtro no aparece y un estado del enlace no vacía la tabla', async ({ page }) => {
    await usarExcel(page, [
      ['Código', 'Descripción', 'Cliente', 'Orden de compra', 'Tipo de orden', 'Estado'],
      ['CN-0001', 'Demo uno', 'Cliente Demo A', 'OC-1', 'Compra', ''],
      ['CN-0002', 'Demo dos', 'Cliente Demo B', 'OC-2', 'Servicio', ''],
    ]);
    await abrir(page, '/?estado=Abierta');
    await expect(page.locator('#campo-estado')).toBeHidden();
    await expect(page.locator('#campo-tipo')).toBeVisible(); // Tipo de orden sí tiene valores
    await expect(page.locator('#contador')).toHaveText('Mostrando 1–2 de 2 resultados (de 2 en total)');
    await expect(page).not.toHaveURL(/estado=/);
  });

  test('un estado escrito de dos formas ("abierta" / "Abierta") es una sola opción, con mayúscula', async ({ page }) => {
    await usarExcel(page, [
      ['Código', 'Descripción', 'Cliente', 'Orden de compra', 'Estado'],
      ['CN-0001', 'Demo uno', 'Cliente Demo A', 'OC-1', 'abierta'],
      ['CN-0002', 'Demo dos', 'Cliente Demo A', 'OC-2', 'Abierta'],
      ['CN-0003', 'Demo tres', 'Cliente Demo A', 'OC-3', 'ANULADA'],
    ]);
    await abrir(page, '/?estado=abierta');
    await expect(page.locator('#f-estado option')).toHaveText(['Todos', 'Abierta', 'ANULADA']);
    await expect(page.locator('#f-estado')).toHaveValue('Abierta');
    await expect(page.locator('#contador')).toHaveText('Mostrando 1–2 de 2 resultados (de 3 en total)');
  });

  test('copiar el código con un clic', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await abrir(page);
    const codigo = (await celdasDeColumna(page, 1))[0];
    await page.getByRole('button', { name: `Copiar código ${codigo}` }).first().click();
    await expect(page.locator('#aviso-flotante')).toContainText(`Código ${codigo} copiado`);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(codigo);
  });

  test('"Actualizar" y la auto-actualización no pierden los filtros', async ({ page }) => {
    await usarConfig(page, { autoActualizarMinutos: 0.05 }); // cada 3 segundos (solo para la prueba)
    let descargas = 0;
    page.on('request', (r) => {
      if (r.url().endsWith('centros-ejemplo.xlsx')) descargas++;
    });
    await abrir(page);
    await page.getByLabel('Buscar', { exact: true }).fill('cableado');
    await page.getByRole('radio', { name: 'Por centro de negocio' }).check();
    // Esperar a que la búsqueda se aplique (el buscador espera 200 ms) ANTES de abrir el primer centro;
    // si no, se podría abrir un centro que después queda fuera de los resultados.
    await expect(page.locator('#contador')).toContainText('centro');
    await expect(page.locator('#contador')).not.toContainText('de 37 centros');
    await page.locator('.btn-expandir').first().click();
    await expect(page.locator('.btn-expandir').first()).toHaveAttribute('aria-expanded', 'true');
    const antes = await page.locator('#contador').innerText();

    await page.getByRole('button', { name: 'Actualizar' }).click();
    await expect(page.locator('#aviso-flotante')).toContainText('Datos actualizados');
    await expect.poll(() => descargas, { timeout: 10_000 }).toBeGreaterThanOrEqual(3); // inicial + manual + automática
    await expect(page.getByLabel('Buscar', { exact: true })).toHaveValue('cableado');
    await expect(page.locator('#contador')).toHaveText(antes);
    await expect(page.locator('.btn-expandir').first()).toHaveAttribute('aria-expanded', 'true');
  });

  test('datos raros del Excel se muestran como texto, nunca como código', async ({ page }) => {
    const errores = vigilarErrores(page);
    await usarExcel(page, [
      ['Código', 'Descripción', 'Cliente', 'Orden de compra'],
      ['CN-<b>1</b>', '<img src=x onerror="window.__xss=1">', '<script>window.__xss=2</script>', '"><svg onload=window.__xss=3>'],
    ]);
    await abrir(page);
    await page.getByLabel('Buscar', { exact: true }).fill('img');
    await expect(page.locator('#tabla-resultados tbody')).toContainText('<img src=x onerror="window.__xss=1">');
    await expect(page.locator('#tabla-resultados tbody')).toContainText('<script>window.__xss=2</script>');
    await expect(page.locator('#tabla-resultados tbody img, #tabla-resultados tbody script, #tabla-resultados tbody svg:not([aria-hidden])')).toHaveCount(0);
    await page.getByRole('radio', { name: 'Por centro de negocio' }).check();
    await page.locator('.btn-expandir').first().click();
    await expect(page.locator('.fila-detalle')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    expect(errores).toEqual([]);
  });

  test('error claro si no se encuentra el Excel, con "Reintentar"', async ({ page }) => {
    await page.route('**/datos/centros-ejemplo.xlsx', (ruta) => ruta.fulfill({ status: 404, body: '' }));
    await page.goto('/');
    await expect(page.locator('#aviso-error')).toContainText('No se encontró el archivo de Excel');
    await expect(page.locator('#aviso-error').getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await expect(page.locator('#btn-exportar')).toBeDisabled();

    await page.unroute('**/datos/centros-ejemplo.xlsx');
    await page.locator('#aviso-error').getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.locator('#contador')).toContainText(`de ${TOTAL_FILAS} resultados`);
    await expect(page.locator('#aviso-error')).toBeHidden();
  });

  test('avisa qué columnas faltan y desactiva sus filtros', async ({ page }) => {
    await usarExcel(page, [
      ['Código', 'Observación'],
      ['CN-0001', 'Algo'],
    ]);
    await abrir(page);
    const aviso = page.locator('#aviso-columnas');
    await expect(aviso).toContainText('No se encontraron estas columnas');
    await expect(aviso).toContainText('Cliente');
    await expect(aviso).toContainText('Orden de compra / servicio');
    await expect(page.getByLabel('Cliente', { exact: true })).toBeDisabled();
    await expect(page.getByLabel('Código', { exact: true })).toBeEnabled();
    await expect(page.locator('#tabla-resultados tbody')).toContainText('Algo');
  });

  test('centro escrito una sola vez (filas de abajo vacías): sus órdenes quedan juntas en "Por centro"', async ({ page }) => {
    await usarExcel(page, [
      ['Código', 'Descripción', 'Cliente', 'Orden de compra'],
      ['CN-0001', 'Demo uno', 'Cliente Demo A', 'OC-1'],
      [null, null, null, 'OC-2'],
      [null, null, null, 'OS-3'],
      ['CN-0002', 'Demo dos', 'Cliente Demo B', 'OC-4'],
      [null, null, null, 'OC-5'],
    ]);
    await abrir(page, '/?vista=centro');
    await expect(page.locator('#contador')).toHaveText('Mostrando 1–2 de 2 centros (de 2 en total)');
    expect(await page.locator('.fila-centro .insignia').allInnerTexts()).toEqual(['3', '2']);
    await page.locator('.detalles-columnas summary').click();
    await expect(page.locator('#info-columnas')).toContainText('se completaron con el centro de la fila de arriba: 3');
  });

  test('config.json con un valor del tipo equivocado: mensaje claro (no se queda en "Cargando…")', async ({ page }) => {
    const errores = vigilarErrores(page);
    await usarConfig(page, { filasPorPagina: 30, columnas: { cliente: 'Cliente' } });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Falta configurar la aplicación' })).toBeVisible();
    await expect(page.locator('#mensaje-cuerpo')).toContainText('filasPorPagina');
    await expect(page.locator('#mensaje-cuerpo')).toContainText('columnas.cliente');
    expect(errores).toEqual([]);
  });

  test('teclado: "/" lleva al buscador y los títulos se ordenan con Enter', async ({ page }) => {
    await abrir(page);
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('/');
    await expect(page.getByLabel('Buscar', { exact: true })).toBeFocused();
    await page.getByRole('button', { name: /^Cliente/ }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tabla-resultados thead th').nth(2)).toHaveAttribute('aria-sort', 'ascending');
  });
});

test.describe('Celular (375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test('sin scroll horizontal de la página; la tabla tiene su propio scroll', async ({ page }) => {
    await abrir(page);
    const medida = await page.evaluate(() => ({
      pagina: document.documentElement.scrollWidth,
      ventana: document.documentElement.clientWidth,
      tabla: document.querySelector('#contenedor-tabla')!.scrollWidth,
      contenedor: document.querySelector('#contenedor-tabla')!.clientWidth,
    }));
    expect(medida.pagina).toBeLessThanOrEqual(medida.ventana);
    expect(medida.tabla).toBeGreaterThan(medida.contenedor);

    // Los filtros se abren con un botón.
    await expect(page.getByLabel('Cliente', { exact: true })).toBeHidden();
    await page.getByRole('button', { name: /^Filtros/ }).click();
    await expect(page.getByLabel('Cliente', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Filtros/ })).toHaveAttribute('aria-expanded', 'true');

    // El número junto a "Filtros" cuenta también el Estado.
    await expect(page.locator('#contador-filtros')).toBeHidden();
    await page.getByLabel('Estado', { exact: true }).selectOption('Abierta');
    await expect(page.locator('#contador-filtros')).toHaveText('1');
    await page.getByLabel('Tipo de orden').selectOption('Compra');
    await expect(page.locator('#contador-filtros')).toHaveText('2');
    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(page.locator('#contador-filtros')).toBeHidden();

    await page.getByRole('radio', { name: 'Por centro de negocio' }).check();
    await page.locator('.btn-expandir').first().click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});

test.describe('Modo Microsoft (sin conectarse a Microsoft)', () => {
  test.beforeEach(async ({ page }) => {
    // Nada sale a internet durante la prueba.
    await page.route(/^https:\/\/(login\.microsoftonline\.com|graph\.microsoft\.com)\//, (r) => r.abort());
  });

  test('muestra la bienvenida con "Iniciar sesión con Microsoft"', async ({ page }) => {
    const errores = vigilarErrores(page);
    await usarConfig(page, {
      modo: 'microsoft',
      microsoft: { clientId: '11111111-2222-3333-4444-555555555555', tenantId: 'aaaaaaaa-0000-0000-0000-000000000001' },
    });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Iniciar sesión con Microsoft' })).toBeVisible();
    // La bienvenida solo muestra el botón: no lista los dominios permitidos.
    await expect(page.locator('#pantalla-login')).not.toContainText('@aic.pe');
    await expect(page.locator('#btn-tema')).toBeVisible(); // el botón de tema también está antes de iniciar sesión
    await expect(page.locator('#pantalla-app')).toBeHidden();
    expect(errores).toEqual([]);
  });

  test('si falta el clientId explica qué configurar', async ({ page }) => {
    await usarConfig(page, { modo: 'microsoft' });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Falta configurar la aplicación' })).toBeVisible();
    await expect(page.locator('#mensaje-cuerpo')).toContainText('clientId');
  });

  test('si falta el tenantId lo pide (con inquilino único Microsoft daría el error AADSTS50194)', async ({ page }) => {
    let pidioLogin = false;
    await page.route(/^https:\/\/login\.microsoftonline\.com\//, (r) => {
      pidioLogin = true;
      return r.abort();
    });
    await usarConfig(page, { modo: 'microsoft', microsoft: { clientId: '11111111-2222-3333-4444-555555555555', tenantId: '' } });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Falta configurar la aplicación' })).toBeVisible();
    await expect(page.locator('#mensaje-cuerpo')).toContainText('microsoft.tenantId');
    expect(pidioLogin).toBe(false);
  });

  test('dominiosPermitidos escrito como texto (sin corchetes): mensaje claro, no "Cargando…" para siempre', async ({ page }) => {
    const errores = vigilarErrores(page);
    await usarConfig(page, {
      modo: 'microsoft',
      microsoft: {
        clientId: '11111111-2222-3333-4444-555555555555',
        tenantId: 'aaaaaaaa-0000-0000-0000-000000000001',
        dominiosPermitidos: 'aic.pe',
      },
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Falta configurar la aplicación' })).toBeVisible();
    await expect(page.locator('#mensaje-cuerpo')).toContainText('dominiosPermitidos');
    await expect(page.locator('#pantalla-carga')).toBeHidden();
    expect(errores).toEqual([]);
  });

  test('la página puente redirect.html existe y carga sin errores de seguridad', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && /Content Security Policy|Refused/i.test(m.text())) errores.push(m.text());
    });
    const respuesta = await page.goto('/redirect.html');
    expect(respuesta?.status()).toBe(200);
    await expect(page.locator('#mensaje')).toBeVisible();
    expect(errores.filter((e) => /Content Security Policy|Refused/i.test(e))).toEqual([]);
  });
});
