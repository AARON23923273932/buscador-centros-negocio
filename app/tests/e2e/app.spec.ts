import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import * as XLSX from 'xlsx/xlsx.mjs';
import { abrir, usarExcel, vigilarErrores } from './ayuda.ts';
import { TONOS_OSCURO } from './colores.ts';
import { usarConfigPruebas, type CambiosConfig } from './config-pruebas.ts';

const TOTAL_FILAS = 80;

test.beforeEach(async ({ context }) => {
  await usarConfigPruebas(context);
});

const normalizar = (s: string) =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const usarConfig = (page: Page, cambios: CambiosConfig) => usarConfigPruebas(page, cambios);

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
    expect((await celdasDeColumna(page, 4)).some((t) => /^000\d+$/.test(t))).toBe(true);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1);
    expect(errores).toEqual([]);
  });

  test('botón de tema (ModeToggle): cada clic pasa al siguiente (claro → oscuro → sistema) y lo recuerda al recargar', async ({ page }) => {
    const errores = vigilarErrores(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await abrir(page);
    const raiz = page.locator('html');
    const boton = page.locator('#btn-tema');
    const fondo = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await expect(raiz).toHaveClass(/\bdark\b/);
    await expect(boton).toHaveAccessibleName('Tema del sistema. Cambiar a tema claro');
    const fondoOscuro = await fondo();

    await boton.click();
    await expect(raiz).toHaveClass(/\blight\b/);
    await expect(boton).toHaveAccessibleName('Tema claro. Cambiar a tema oscuro');
    expect(await fondo()).not.toBe(fondoOscuro);

    await boton.click();
    await expect(raiz).toHaveClass(/\bdark\b/);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await expect(raiz).toHaveClass(/\bdark\b/);
    await expect(boton).toHaveAccessibleName('Tema oscuro. Cambiar a tema del sistema');
    expect(await fondo()).toBe(fondoOscuro);

    await boton.click();
    await expect(raiz).toHaveClass(/\blight\b/);
    await expect(boton).toHaveAccessibleName('Tema del sistema. Cambiar a tema claro');
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
    expect(opciones.slice(1)).toEqual(opciones.slice(1).sort((a, b) => a.localeCompare(b, 'es')));
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
    await expect(page).toHaveURL(/\/centros\?/);
    await expect(page).not.toHaveURL(/vista=/);
    await expect(page).toHaveURL(/cliente=/);
    const enlace = page.url();
    const valorCliente = await page.getByLabel('Cliente', { exact: true }).inputValue();

    const otra = await context.newPage();
    await abrir(otra, enlace);
    await expect(otra.getByLabel('Buscar', { exact: true })).toHaveValue('cableado');
    await expect(otra.getByLabel('Cliente', { exact: true })).toHaveValue(valorCliente);
    await expect(otra.getByRole('radio', { name: 'Por centro de negocio' })).toBeChecked();
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
    await expect(page.getByRole('button', { name: /^Código/ })).toBeFocused();

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
    await page.keyboard.press('Enter');
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
    const medidas = (el: Element) => {
      const e = getComputedStyle(el);
      return { alto: e.height, izquierda: e.paddingLeft, derecha: e.paddingRight };
    };
    expect(await saltar.evaluate(medidas)).toEqual(await page.getByRole('button', { name: 'Exportar a Excel' }).evaluate(medidas));
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

    await page.getByRole('button', { name: /^N° de órdenes/ }).click();
    await page.getByRole('button', { name: /^N° de órdenes/ }).click();
    const conteos = (await page.locator('.fila-centro .insignia').allInnerTexts()).map(Number);
    expect(conteos).toEqual([...conteos].sort((a, b) => b - a));

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

    expect(matriz[0]).not.toContain('Monto');
    expect(matriz[0]).not.toContain('Moneda');
    expect(matriz[0]).toContain('Estado');
    expect(matriz.flat().some((v) => /^(PEN|USD)$/.test(String(v)))).toBe(false);

    const hoja = XLSX.read(readFileSync(await descarga.path()), { type: 'buffer', cellNF: true }).Sheets['Órdenes'];
    const datos = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, raw: true });
    const iFecha = datos[0].indexOf('Fecha de creación');
    const celdaFecha = hoja[XLSX.utils.encode_cell({ r: 1, c: iFecha })];
    expect(celdaFecha.t).toBe('n');
    expect(XLSX.SSF.is_date(celdaFecha.z)).toBe(true);
  });

  test('exportar con la página abierta desde antes de una publicación nueva: avisa que hay que recargar', async ({ page }) => {
    await abrir(page);
    await page.route(/\/assets\/exportar-[^/]+\.js$/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Buscador</title>' }));
    let descargas = 0;
    page.on('download', () => descargas++);
    await page.getByRole('button', { name: 'Exportar a Excel' }).click();
    await expect(page.locator('#aviso-flotante')).toContainText('hay una versión nueva de la app. Recarga la página (F5)');
    expect(descargas).toBe(0);
  });

  test('Monto y Moneda no aparecen (ni se buscan); "Columnas detectadas" dice cuáles se ocultaron', async ({ page }) => {
    const errores = vigilarErrores(page);
    await abrir(page);
    const titulos = await page.locator('#tabla-resultados thead th').allInnerTexts();
    expect(titulos.map((t) => t.trim())).toEqual([
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

    await page.getByLabel('Buscar', { exact: true }).fill('usd');
    await expect(page.locator('.fila-vacia')).toContainText('No hay resultados');

    await page.getByRole('button', { name: 'Borrar búsqueda' }).click();
    await page.getByRole('radio', { name: 'Por centro de negocio' }).check();
    await page.locator('.btn-expandir').first().click();
    const anidada = await page.locator('.fila-detalle .tabla-anidada thead th').allInnerTexts();
    expect(anidada).not.toContain('Monto');
    expect(anidada).not.toContain('Moneda');
    expect(anidada).toContain('Estado');

    await page.getByRole('button', { name: 'Columnas detectadas en el Excel' }).click();
    await expect(page.locator('#info-columnas')).toContainText('Columnas ocultas (no se muestran, no se buscan ni se exportan): Monto (G), Moneda (H)');
    await expect(page.locator('#info-columnas')).toContainText('Estado');
    await expect(page.locator('#info-columnas .ubicacion-excel')).toHaveCount(0);
    expect(errores).toEqual([]);
  });

  test('filtro "Estado": desplegable con las opciones del Excel, en la URL, se limpia y se exporta', async ({ page, context }) => {
    await abrir(page);
    const estado = page.getByLabel('Estado', { exact: true });
    await expect(estado).toBeVisible();
    expect(await estado.evaluate((el) => el.tagName)).toBe('SELECT');
    expect(await estado.locator('option').allInnerTexts()).toEqual(['Todos', 'Abierta', 'Cerrada', 'En ejecución', 'Sin orden aún']);
    expect(await page.getByLabel('Tipo de orden').evaluate((el) => el.tagName)).toBe('SELECT');

    await estado.selectOption('Cerrada');
    await expect(page.locator('#contador')).toContainText('de 35 resultados');
    expect(new Set(await celdasDeColumna(page, 7))).toEqual(new Set(['Cerrada']));
    await expect(page).toHaveURL(/estado=Cerrada/);

    await page.getByLabel('Tipo de orden').selectOption('Servicio');
    await expect(page.locator('#contador')).toContainText('de 18 resultados');

    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exportar a Excel' }).click(),
    ]);
    const libro = XLSX.read(readFileSync(await descarga.path()), { type: 'buffer' });
    const matriz = XLSX.utils.sheet_to_json<unknown[]>(libro.Sheets['Órdenes'], { header: 1 });
    const iEstado = matriz[0].indexOf('Estado');
    expect(matriz.length - 1).toBe(18);
    for (const fila of matriz.slice(1)) expect(fila[iEstado]).toBe('Cerrada');

    const otra = await context.newPage();
    await abrir(otra, page.url());
    await expect(otra.getByLabel('Estado', { exact: true })).toHaveValue('Cerrada');
    await expect(otra.locator('#contador')).toContainText('de 18 resultados');
    await otra.close();

    await page.getByRole('button', { name: 'Limpiar filtros' }).click();
    await expect(estado).toHaveValue('');
    await expect(page.locator('#contador')).toContainText(`de ${TOTAL_FILAS} resultados`);
    await expect(page).not.toHaveURL(/estado=/);

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
    await expect(page.locator('#campo-tipo')).toBeVisible();
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
    await usarConfig(page, { autoActualizarMinutos: 0.05 });
    let descargas = 0;
    page.on('request', (r) => {
      if (r.url().endsWith('centros-ejemplo.xlsx')) descargas++;
    });
    await abrir(page);
    await page.getByLabel('Buscar', { exact: true }).fill('cableado');
    await page.getByRole('radio', { name: 'Por centro de negocio' }).check();
    await expect(page.locator('#contador')).toContainText('centro');
    await expect(page.locator('#contador')).not.toContainText('de 37 centros');
    await page.locator('.btn-expandir').first().click();
    await expect(page.locator('.btn-expandir').first()).toHaveAttribute('aria-expanded', 'true');
    const antes = await page.locator('#contador').innerText();

    await page.getByRole('button', { name: 'Actualizar' }).click();
    await expect(page.locator('#aviso-flotante')).toContainText('Datos actualizados');
    await expect.poll(() => descargas, { timeout: 10_000 }).toBeGreaterThanOrEqual(3);
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

    for (const selector of ['#f-cliente', '#f-descripcion']) {
      const bajoElMouse = await page.locator(selector).evaluate((control) => {
        const caja = control.getBoundingClientRect();
        const debajo = document.elementFromPoint(caja.left + caja.width / 2, caja.top + caja.height / 2)!;
        return { ayuda: debajo.closest('[title]')?.getAttribute('title') ?? null, propio: control.getAttribute('title') };
      });
      expect(bajoElMouse, selector).toEqual({ ayuda: 'No se encontró esta columna en el Excel', propio: 'No se encontró esta columna en el Excel' });
    }
    expect(await page.locator('#f-codigo').evaluate((control) => control.closest('[title]')?.getAttribute('title') ?? null)).toBeNull();
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
    await page.getByRole('button', { name: 'Columnas detectadas en el Excel' }).click();
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

  test('teclado: "Por orden / Por centro" se elige con las flechas; Tab entra por la opción elegida', async ({ page }) => {
    await abrir(page, '/ordenes');
    const grupo = page.getByRole('radiogroup', { name: 'Forma de ver los resultados' });
    const porOrden = grupo.getByRole('radio', { name: 'Por orden' });
    const porCentro = grupo.getByRole('radio', { name: 'Por centro de negocio' });
    await porOrden.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(porOrden).not.toBeFocused();
    await page.keyboard.press('Tab');
    await expect(porOrden).toBeFocused();
    await expect(porOrden).toHaveAttribute('aria-checked', 'true');

    const flecha = (tecla: string) => page.keyboard.press(tecla, { delay: 50 });
    await flecha('ArrowRight');
    await expect(page).toHaveURL(/\/centros$/);
    await expect(porCentro).toBeFocused();
    await expect(porCentro).toHaveAttribute('aria-checked', 'true');
    await expect(porOrden).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('#contador')).toContainText('centro');

    await flecha('ArrowLeft');
    await expect(page).toHaveURL(/\/ordenes$/);
    await expect(porOrden).toBeFocused();
    await expect(porOrden).toHaveAttribute('aria-checked', 'true');
    await expect(porCentro).toHaveAttribute('aria-checked', 'false');

    await flecha('ArrowDown');
    await expect(page).toHaveURL(/\/centros$/);
    await page.keyboard.press('Tab');
    await expect(porCentro).not.toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(porCentro).toBeFocused();
  });

  test('teclado: sin columna de centro, "Por centro" está desactivado y las flechas no cambian la vista', async ({ page }) => {
    await usarExcel(page, [
      ['Cliente', 'Orden de compra'],
      ['Cliente Demo A', 'OC-1'],
    ]);
    await abrir(page, '/ordenes');
    const porOrden = page.getByRole('radio', { name: 'Por orden' });
    await expect(page.getByRole('radio', { name: 'Por centro de negocio' })).toBeDisabled();
    await porOrden.focus();
    for (const tecla of ['ArrowRight', 'ArrowLeft', 'ArrowDown']) {
      await page.keyboard.press(tecla);
      await expect(porOrden).toBeFocused();
      await expect(porOrden).toHaveAttribute('aria-checked', 'true');
    }
    await expect(page).toHaveURL(/\/ordenes$/);
  });

  test('teclado: "Columnas detectadas en el Excel" se abre y se cierra con Enter y con Espacio', async ({ page }) => {
    await abrir(page, '/ordenes');
    const boton = page.getByRole('button', { name: 'Columnas detectadas en el Excel' });
    await boton.focus();
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#info-columnas')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#info-columnas')).toBeHidden();
    await page.keyboard.press('Space');
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Space');
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
    await expect(boton).toBeFocused();
  });
});

const CODIGO_DE_LA_APP = /\/assets\/.+\.js$/;

test('antes de que cargue el código: #raiz vacío y fondo del modo del sistema (oscuro), sin destello blanco', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.route(CODIGO_DE_LA_APP, (ruta) => ruta.abort());
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  expect(await page.locator('#raiz').evaluate((el) => el.childElementCount)).toBe(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(TONOS_OSCURO.fondo);
});

test('con el código: React dibuja el diseño (cabecera, ☀️/🌙, "Saltar al buscador") y "Cargando…" mientras llega config.json', async ({ page }) => {
  await page.route('**/config.json', () => {});
  await page.goto('/');
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Buscador de centros de negocio' })).toBeVisible();
  await expect(page.locator('#btn-tema')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Saltar al buscador' })).toBeAttached();
  await expect(page.locator('main#principal .tarjeta-centro')).toContainText('Cargando…');
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

    await expect(page.getByLabel('Cliente', { exact: true })).toBeHidden();
    await page.getByRole('button', { name: /^Filtros/ }).click();
    await expect(page.getByLabel('Cliente', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Filtros/ })).toHaveAttribute('aria-expanded', 'true');

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
    await expect(page.locator('#pantalla-login')).not.toContainText('@aic.pe');
    await expect(page.locator('#btn-tema')).toBeVisible();
    await expect(page.locator('#pantalla-app')).toBeHidden();
    expect(errores).toEqual([]);
  });

  test('todas las rutas piden iniciar sesión (también el detalle y una que no existe)', async ({ page }) => {
    let descargas = 0;
    page.on('request', (r) => {
      if (/centros-ejemplo\.xlsx|sharepoint\.com/.test(r.url())) descargas++;
    });
    await usarConfig(page, {
      modo: 'microsoft',
      microsoft: { clientId: '11111111-2222-3333-4444-555555555555', tenantId: 'aaaaaaaa-0000-0000-0000-000000000001' },
    });
    for (const ruta of ['/ordenes?q=cableado', '/centros', '/centros/CN-0005', '/no-existe']) {
      await page.goto(ruta);
      await expect(page.getByRole('button', { name: 'Iniciar sesión con Microsoft' })).toBeVisible();
      await expect(page.locator('#pantalla-app, #detalle-centro, #pantalla-no-encontrada')).toHaveCount(0);
      expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(ruta);
      await expect(page.locator('#btn-login')).toBeFocused();
      expect(await page.locator('#btn-login').evaluate((b) => b.matches(':focus-visible'))).toBe(false);
    }
    expect(descargas).toBe(0);
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
