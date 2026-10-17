import { expect, test, type Page } from '@playwright/test';
import { abrir, usarExcel, vigilarErrores } from './ayuda.ts';
import { usarConfigPruebas } from './config-pruebas.ts';

test.beforeEach(async ({ context }) => {
  await usarConfigPruebas(context);
});

function contarDescargas(page: Page) {
  const conteo = { excel: 0, config: [] as string[] };
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.pathname.endsWith('centros-ejemplo.xlsx')) conteo.excel++;
    if (url.pathname.endsWith('config.json')) conteo.config.push(url.pathname);
  });
  return conteo;
}

const ruta = (page: Page) => {
  const url = new URL(page.url());
  return decodeURIComponent(url.pathname) + url.search;
};

test.describe('Rutas (React Router)', () => {
  test('"/" lleva a /ordenes conservando la búsqueda del enlace', async ({ page }) => {
    const errores = vigilarErrores(page);
    await abrir(page, '/?q=cableado&estado=Abierta');
    await expect(page).toHaveURL(/\/ordenes\?q=cableado&estado=Abierta$/);
    await expect(page.getByLabel('Buscar', { exact: true })).toHaveValue('cableado');
    await expect(page.getByLabel('Estado', { exact: true })).toHaveValue('Abierta');
    await expect(page.getByRole('radio', { name: 'Por orden' })).toBeChecked();
    expect(errores).toEqual([]);
  });

  test('enlaces viejos con ?vista=centro llevan a /centros con el resto de la búsqueda', async ({ page }) => {
    await abrir(page, '/?q=cableado&vista=centro&cliente=Cliente+Demo+B+S.A.');
    await expect(page).toHaveURL(/\/centros\?q=cableado&cliente=Cliente\+Demo\+B\+S\.A\.$/);
    await expect(page.getByRole('radio', { name: 'Por centro de negocio' })).toBeChecked();
    await expect(page.getByLabel('Cliente', { exact: true })).toHaveValue('Cliente Demo B S.A.');
    await expect(page.locator('#contador')).toContainText('centro');

    await abrir(page, '/ordenes?vista=centro&desc=fibra');
    await expect(page).toHaveURL(/\/centros\?desc=fibra$/);
    await expect(page.locator('.fila-centro').first()).toBeVisible();
  });

  test('"Por orden / Por centro" cambia de ruta; el botón atrás vuelve con los mismos filtros y orden', async ({ page }) => {
    const descargas = contarDescargas(page);
    await abrir(page, '/ordenes');
    await page.getByLabel('Buscar', { exact: true }).fill('cableado');
    await expect(page).toHaveURL(/\/ordenes\?q=cableado$/);
    await page.getByLabel('Cliente', { exact: true }).selectOption('Corporación Ejemplo Perú S.A.C.');
    await page.getByRole('button', { name: /^Código/ }).click();
    await expect(page).toHaveURL(/ord=codigoCentro/);
    const contadorOrdenes = await page.locator('#contador').innerText();

    const radioCentro = page.getByRole('radio', { name: 'Por centro de negocio' });
    await radioCentro.check();
    await expect(page).toHaveURL(/\/centros\?q=cableado&cliente=Corporaci%C3%B3n\+Ejemplo\+Per%C3%BA\+S\.A\.C\.$/);
    await expect(page.locator('#contador')).toContainText('centro');
    await expect(page.getByLabel('Buscar', { exact: true })).toHaveValue('cableado');
    await expect(radioCentro).toBeFocused();

    await page.goBack();
    await expect(page).toHaveURL(/\/ordenes\?q=cableado&cliente=.+&ord=codigoCentro$/);
    await expect(page.getByRole('radio', { name: 'Por orden' })).toBeChecked();
    await expect(page.getByLabel('Buscar', { exact: true })).toHaveValue('cableado');
    await expect(page.getByLabel('Cliente', { exact: true })).toHaveValue('Corporación Ejemplo Perú S.A.C.');
    await expect(page.locator('#tabla-resultados thead th').first()).toHaveAttribute('aria-sort', 'ascending');
    await expect(page.locator('#contador')).toHaveText(contadorOrdenes);

    await page.goForward();
    await expect(page).toHaveURL(/\/centros\?/);
    await expect(page.getByRole('radio', { name: 'Por centro de negocio' })).toBeChecked();
    await expect(page.locator('#contador')).toContainText('centro');
    expect(descargas.excel).toBe(1);
  });

  test('el código del centro lleva a su detalle; "Volver a la lista" regresa con los mismos filtros', async ({ page }) => {
    const errores = vigilarErrores(page);
    const descargas = contarDescargas(page);
    await abrir(page, '/ordenes?q=cn0005&tipo=Servicio');
    await expect(page.locator('#contador')).toContainText('de 2 resultados');

    await page.getByRole('link', { name: 'CN-0005' }).first().click();
    await expect(page).toHaveURL(/\/centros\/CN-0005\?q=cn0005&tipo=Servicio$/);
    const titulo = page.getByRole('heading', { level: 2, name: 'Centro de negocio CN-0005' });
    await expect(titulo).toBeVisible();
    await expect(titulo).toBeFocused();
    const ficha = page.locator('#ficha-centro');
    await expect(ficha).toContainText('Instalación de red de datos – Sede Demo 5');
    await expect(ficha).toContainText('Inmobiliaria Demo Ñandú E.I.R.L.');
    await expect(ficha).toContainText('Cerrada, En ejecución');
    await expect(page.locator('#tabla-detalle tbody tr')).toHaveCount(3);
    await expect(page.locator('#tabla-detalle')).toContainText('Compra');
    expect((await page.locator('#tabla-detalle thead th').allInnerTexts()).map((t) => t.trim())).toEqual([
      'Código',
      'Descripción del centro de negocio',
      'Cliente',
      'N° Orden',
      'Tipo de orden',
      'Fecha de creación',
      'Estado',
    ]);
    for (const oculto of ['Monto', 'Moneda', 'PEN', 'USD']) await expect(page.locator('#detalle-centro')).not.toContainText(oculto);
    await expect(page.locator('#detalle-centro .enlace-codigo')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Copiar código CN-0005' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute('href', '#principal');

    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await expect(page).toHaveURL(/\/ordenes\?q=cn0005&tipo=Servicio$/);
    await expect(page.getByLabel('Buscar', { exact: true })).toHaveValue('cn0005');
    await expect(page.getByLabel('Tipo de orden')).toHaveValue('Servicio');
    await expect(page.locator('#contador')).toContainText('de 2 resultados');
    expect(descargas.excel).toBe(1);
    expect(errores).toEqual([]);
  });

  test('desde "Por centro": el enlace abre el detalle (sin abrir la fila) y el botón atrás conserva los filtros', async ({ page }) => {
    await abrir(page, '/centros?q=cableado');
    const fila = page.locator('.fila-centro').first();
    const clave = await fila.getAttribute('data-grupo');
    await fila.locator('.btn-expandir').click();
    await expect(fila.locator('.btn-expandir')).toHaveAttribute('aria-expanded', 'true');

    const codigo = await fila.locator('.enlace-codigo').innerText();
    await fila.locator('.enlace-codigo').click();
    await expect(page).toHaveURL(new RegExp(`/centros/${codigo}\\?q=cableado$`));
    await expect(page.getByRole('heading', { level: 2, name: `Centro de negocio ${codigo}` })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/centros\?q=cableado$/);
    await expect(page.getByLabel('Buscar', { exact: true })).toHaveValue('cableado');
    await expect(page.locator(`.btn-expandir[data-grupo="${clave}"]`)).toHaveAttribute('aria-expanded', 'true');
  });

  test('copiar el código no abre el detalle', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await abrir(page, '/ordenes?q=cn0005');
    await page.getByRole('button', { name: 'Copiar código CN-0005' }).first().click();
    await expect(page.locator('#aviso-flotante')).toContainText('Código CN-0005 copiado');
    await expect(page).toHaveURL(/\/ordenes\?q=cn0005$/);
  });

  test('enlace directo al detalle y al recargar: la app abre el detalle (servidor de prueba: vite preview)', async ({ page }) => {
    const errores = vigilarErrores(page);
    const descargas = contarDescargas(page);
    const respuesta = await page.goto('/centros/CN-0005?q=cableado');
    expect(respuesta?.status()).toBe(200);
    await expect(page.locator('#tabla-detalle tbody tr')).toHaveCount(3);
    await page.reload();
    await expect(page.locator('#tabla-detalle tbody tr')).toHaveCount(3);
    expect([...new Set(descargas.config)]).toEqual(['/config.json']);
    expect(descargas.excel).toBe(2);
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await expect(page).toHaveURL(/\/centros\?q=cableado$/);
    await expect(page.locator('#contador')).toContainText('centros');
    expect(errores).toEqual([]);
  });

  test('un código que no existe: mensaje claro y "Volver a la lista"', async ({ page }) => {
    await page.goto('/centros/NO-EXISTE-999?q=x');
    await expect(page.locator('#centro-no-encontrado')).toContainText('No se encontró el centro de negocio “NO-EXISTE-999” en el Excel.');
    await expect(page.locator('#tabla-detalle')).toHaveCount(0);
    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await expect(page).toHaveURL(/\/centros\?q=x$/);
  });

  test('códigos con "/", espacios o "#": el enlace se codifica y el detalle los encuentra', async ({ page }) => {
    await usarExcel(page, [
      ['Código', 'Descripción', 'Cliente', 'Orden de compra'],
      ['CN/01 #A', 'Centro raro', 'Cliente Demo A', 'OC-1'],
      ['CN/01 #A', 'Centro raro', 'Cliente Demo A', 'OC-2'],
      ['A2338PY01', 'Centro normal', 'Cliente Demo B', 'OC-3'],
      ['50%2F', 'Centro con por ciento', 'Cliente Demo C', 'OC-4'],
      ['.', 'Centro punto', 'Cliente Demo C', 'OC-5'],
      ['..', 'Centro dos puntos', 'Cliente Demo C', 'OC-6'],
    ]);
    await abrir(page, '/ordenes');
    await page.getByRole('link', { name: 'CN/01 #A' }).first().click();
    await expect(page).toHaveURL(/\/centros\/CN%2F01%20%23A$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Centro de negocio CN/01 #A' })).toBeVisible();
    await expect(page.locator('#tabla-detalle tbody tr')).toHaveCount(2);
    await page.reload();
    await expect(page.locator('#tabla-detalle tbody tr')).toHaveCount(2);
    await page.goto('/centros/a2338py01');
    await expect(page.getByRole('heading', { level: 2, name: 'Centro de negocio A2338PY01' })).toBeVisible();

    await abrir(page, '/ordenes');
    await page.getByRole('link', { name: '50%2F', exact: true }).click();
    await expect(page).toHaveURL(/\/centros\/50%252F$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Centro de negocio 50%2F' })).toBeVisible();
    await expect(page.locator('#tabla-detalle tbody tr')).toHaveCount(1);
    await page.reload();
    await expect(page.locator('#tabla-detalle tbody tr')).toHaveCount(1);

    await abrir(page, '/ordenes');
    for (const [codigo, exacto] of [['.', /^\.$/], ['..', /^\.\.$/]] as const) {
      await expect(page.getByRole('link', { name: codigo, exact: true })).toHaveCount(0);
      await expect(page.locator('#tabla-resultados span.codigo').filter({ hasText: exacto })).toHaveCount(1);
      await expect(page.getByRole('button', { name: `Copiar código ${codigo}`, exact: true })).toBeVisible();
    }
  });

  test('con el teclado: al volver del detalle, el foco regresa al enlace que lo abrió (no se pierde)', async ({ page }) => {
    await abrir(page, '/ordenes?q=cn0005');
    const enlaces = page.locator('#tabla-resultados a.enlace-codigo');
    await expect(enlaces).toHaveCount(3);
    await enlaces.nth(0).focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(enlaces.nth(1)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#titulo-detalle')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#btn-volver')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/ordenes\?q=cn0005$/);
    await expect(enlaces.nth(1)).toBeFocused();
    expect(await enlaces.nth(1).evaluate((a) => a.matches(':focus-visible'))).toBe(true);

    await page.keyboard.press('Enter');
    await expect(page.locator('#titulo-detalle')).toBeFocused();
    await page.goBack();
    await expect(page).toHaveURL(/\/ordenes\?q=cn0005$/);
    await expect(enlaces.nth(1)).toBeFocused();

    await abrir(page, '/centros/CN-0005?q=cn0005');
    await page.locator('#btn-volver').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/centros\?q=cn0005$/);
    await expect(page.locator('#tabla-resultados a.enlace-codigo', { hasText: 'CN-0005' })).toBeFocused();
    await abrir(page, '/centros/CN-0005?q=cableado');
    await page.locator('#btn-volver').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/centros\?q=cableado$/);
    await expect(page.getByLabel('Buscar', { exact: true })).toBeFocused();
  });

  test('"Saltar al contenido" en el detalle no cambia la dirección: "Volver" sigue regresando a la lista de origen', async ({ page }) => {
    await abrir(page, '/ordenes?q=cn0005');
    await page.getByRole('link', { name: 'Saltar al buscador' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Buscar', { exact: true })).toBeFocused();
    await expect(page).toHaveURL(/\/ordenes\?q=cn0005$/);

    await page.getByRole('link', { name: 'CN-0005' }).first().click();
    await expect(page).toHaveURL(/\/centros\/CN-0005\?q=cn0005$/);
    const historial = await page.evaluate(() => history.length);
    await page.getByRole('link', { name: 'Saltar al contenido' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#principal')).toBeFocused();
    await expect(page).toHaveURL(/\/centros\/CN-0005\?q=cn0005$/);
    expect(await page.evaluate(() => history.length)).toBe(historial);
    await page.keyboard.press('Tab');
    await expect(page.locator('#btn-actualizar')).toBeFocused();

    await page.getByRole('link', { name: 'Volver a la lista' }).click();
    await expect(page).toHaveURL(/\/ordenes\?q=cn0005$/);
    await expect(page.getByRole('radio', { name: 'Por orden' })).toBeChecked();
    expect(await page.evaluate(() => history.length)).toBe(historial);
  });

  test('"Página no encontrada" para cualquier otra dirección, con enlace al buscador', async ({ page }) => {
    const errores = vigilarErrores(page);
    const descargas = contarDescargas(page);
    for (const direccion of ['/esto/no/existe', '/centros/CN-0005/extra']) {
      const respuesta = await page.goto(direccion);
      expect(respuesta?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 2, name: 'Página no encontrada' })).toBeVisible();
      await expect(page.locator('#pantalla-no-encontrada')).toContainText(direccion);
      await expect(page.locator('#pantalla-app')).toHaveCount(0);
    }
    expect(descargas.excel).toBe(0);
    await page.getByRole('link', { name: 'Ir al buscador' }).click();
    await expect(page).toHaveURL(/\/ordenes$/);
    await expect(page.locator('#contador')).toContainText('Mostrando');
    expect(errores).toEqual([]);
  });

  test('la página puente redirect.html y los archivos no pasan por las rutas', async ({ page, request }) => {
    expect((await request.get('/redirect.html')).headers()['content-type']).toContain('text/html');
    expect(await (await request.get('/redirect.html')).text()).toContain('Completando el inicio de sesión');
    expect((await request.get('/config.json')).headers()['content-type']).toContain('application/json');
    expect((await request.get('/favicon.svg')).headers()['content-type']).toContain('image/svg');
    await page.goto('/redirect.html');
    await expect(page.locator('#mensaje')).toBeVisible();
    await expect(page.locator('#pantalla-no-encontrada')).toHaveCount(0);
    expect(ruta(page)).toBe('/redirect.html');
  });
});

test.describe('Rutas en el celular (375 px)', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test('el detalle no tiene scroll horizontal de la página (la tabla tiene el suyo)', async ({ page }) => {
    await page.goto('/centros/CN-0005');
    await expect(page.locator('#tabla-detalle tbody tr')).toHaveCount(3);
    const medida = await page.evaluate(() => ({
      pagina: document.documentElement.scrollWidth,
      ventana: document.documentElement.clientWidth,
      tabla: document.querySelector('#contenedor-detalle')!.scrollWidth,
      contenedor: document.querySelector('#contenedor-detalle')!.clientWidth,
    }));
    expect(medida.pagina).toBeLessThanOrEqual(medida.ventana);
    expect(medida.tabla).toBeGreaterThan(medida.contenedor);
  });
});
