// Cambios de diseño pedidos por el supervisor (Gustavo, 14/10/2026), medidos en Chromium:
//   1. Más margen a los lados: el contenido no usa todo el ancho de la pantalla.
//   2. Contornos menos agresivos: bordes de 1 px y un anillo suave al llegar con el teclado (no con el mouse).
//   3. Íconos alineados con su texto (mismo tamaño, sin desfase vertical).
import { expect, test, type Page } from '@playwright/test';
import { abrir } from './ayuda.ts';
import { usarConfigPruebas } from './config-pruebas.ts';

test.beforeEach(async ({ context }) => {
  await usarConfigPruebas(context);
});

/** Diferencia en px entre el centro vertical de un ícono y el centro del texto a su lado. */
async function desfase(page: Page, selectorIcono: string, selectorTexto: string): Promise<{ tamano: number[]; desfase: number }> {
  return page.evaluate(
    ([si, st]) => {
      const icono = document.querySelector(si)!.getBoundingClientRect();
      const el = document.querySelector(st)!;
      // Solo la caja del texto (no la del botón entero): el primer nodo de texto con letras.
      const recorrido = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
      });
      const nodo = recorrido.nextNode();
      const rango = document.createRange();
      if (nodo) rango.selectNodeContents(nodo);
      const texto = nodo ? rango.getBoundingClientRect() : el.getBoundingClientRect();
      const centro = (r: DOMRect) => r.top + r.height / 2;
      return { tamano: [icono.width, icono.height], desfase: Math.abs(centro(icono) - centro(texto)) };
    },
    [selectorIcono, selectorTexto] as const,
  );
}

test.describe('Diseño (pedido del supervisor)', () => {
  test('1. más margen a los lados: el contenido va centrado con un ancho máximo cómodo', async ({ page }) => {
    for (const ancho of [1920, 1440, 1280]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await abrir(page, '/ordenes');
      const m = await page.evaluate(() => {
        const contenido = document.querySelector('#pantalla-app')!.getBoundingClientRect();
        const logo = document.querySelector('.cabecera .logo')!.getBoundingClientRect();
        const cabecera = document.querySelector('.cabecera')!.getBoundingClientRect();
        const visible = document.documentElement.clientWidth; // sin la barra de desplazamiento
        return { izq: contenido.left, der: visible - contenido.right, ancho: contenido.width, logo: logo.left, cabecera: cabecera.width, visible };
      });
      expect(m.ancho).toBeLessThanOrEqual(1240);
      expect(m.izq).toBeGreaterThanOrEqual(48); // antes: 16 px
      expect(Math.abs(m.izq - m.der)).toBeLessThanOrEqual(1); // centrado
      expect(Math.abs(m.logo - m.izq)).toBeLessThanOrEqual(1); // la cabecera alineada con el contenido…
      expect(m.cabecera).toBe(m.visible); // …aunque su fondo ocupe todo el ancho
    }
    // En el celular: 16 px a cada lado y sin scroll horizontal de la página.
    await page.setViewportSize({ width: 375, height: 812 });
    await abrir(page, '/ordenes');
    const celular = await page.evaluate(() => ({
      izq: document.querySelector('#pantalla-app')!.getBoundingClientRect().left,
      pagina: document.documentElement.scrollWidth,
      ventana: document.documentElement.clientWidth,
    }));
    expect(celular.izq).toBe(16);
    expect(celular.pagina).toBeLessThanOrEqual(celular.ventana);
  });

  test('2. contornos suaves: bordes de 1 px; anillo de foco solo con el teclado', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    for (const selector of ['#buscador', '#f-cliente', '#f-codigo', '#tam-pagina', '#btn-exportar', '#contenedor-tabla', '.filtros']) {
      expect(await page.locator(selector).evaluate((el) => getComputedStyle(el).borderTopWidth), selector).toBe('1px');
    }

    // Con el mouse: sin anillo.
    const actualizar = page.getByRole('button', { name: 'Actualizar' });
    await actualizar.click();
    await expect(actualizar).toBeFocused();
    const conMouse = await actualizar.evaluate((b) => ({ visible: b.matches(':focus-visible'), sombra: getComputedStyle(b).boxShadow }));
    expect(conMouse.visible).toBe(false);
    expect(conMouse.sombra).toBe('none');

    // Con el teclado: borde primario + anillo semitransparente (no el contorno de 3 px de antes).
    await page.getByLabel('Filas por página').focus();
    await page.keyboard.press('Tab');
    const exportar = page.getByRole('button', { name: 'Exportar a Excel' });
    await expect(exportar).toBeFocused();
    const conTeclado = await exportar.evaluate((b) => {
      const e = getComputedStyle(b);
      return { visible: b.matches(':focus-visible'), sombra: e.boxShadow, borde: e.borderTopColor, contorno: e.outlineColor };
    });
    expect(conTeclado.visible).toBe(true);
    expect(conTeclado.sombra).toMatch(/rgba\(29, 91, 191, 0\.32\) 0px 0px 0px 3px/);
    expect(conTeclado.borde).toBe('rgb(29, 91, 191)');
    expect(conTeclado.contorno).toBe('rgba(0, 0, 0, 0)'); // transparente: solo se ve en alto contraste de Windows

    // Enlaces (sin borde): contorno fino de 2 px, bien visible.
    await page.getByRole('link', { name: 'CN-0001' }).first().focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const enlace = await page.evaluate(() => {
      const e = getComputedStyle(document.activeElement!);
      return { clase: document.activeElement!.className, ancho: e.outlineWidth, estilo: e.outlineStyle };
    });
    expect(enlace).toEqual({ clase: 'codigo enlace-codigo', ancho: '2px', estilo: 'solid' });
  });

  test('2. en modo oscuro el anillo de foco también se ve con el teclado (y no con el mouse)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await abrir(page, '/ordenes');
    expect(await page.evaluate(() => document.documentElement.dataset.temaEfectivo)).toBe('oscuro');

    const actualizar = page.getByRole('button', { name: 'Actualizar' });
    await actualizar.click();
    expect(await actualizar.evaluate((b) => ({ visible: b.matches(':focus-visible'), sombra: getComputedStyle(b).boxShadow }))).toEqual({
      visible: false,
      sombra: 'none',
    });

    // Con el teclado: borde y anillo en el azul claro del modo oscuro (se distingue sobre el fondo oscuro).
    await page.getByLabel('Filas por página').focus();
    await page.keyboard.press('Tab');
    const exportar = page.getByRole('button', { name: 'Exportar a Excel' });
    await expect(exportar).toBeFocused();
    const conTeclado = await exportar.evaluate((b) => {
      const e = getComputedStyle(b);
      return { visible: b.matches(':focus-visible'), sombra: e.boxShadow, borde: e.borderTopColor };
    });
    expect(conTeclado.visible).toBe(true);
    expect(conTeclado.sombra).toMatch(/rgba\(121, 168, 255, 0\.4\) 0px 0px 0px 3px/);
    expect(conTeclado.borde).toBe('rgb(121, 168, 255)');

    // Enlace del código: contorno de 2 px en el mismo azul claro.
    await page.getByRole('link', { name: 'CN-0001' }).first().focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const enlace = await page.evaluate(() => {
      const e = getComputedStyle(document.activeElement!);
      return { ancho: e.outlineWidth, estilo: e.outlineStyle, color: e.outlineColor };
    });
    expect(enlace).toEqual({ ancho: '2px', estilo: 'solid', color: 'rgb(121, 168, 255)' });
  });

  test('3. el logo de Microsoft del botón "Iniciar sesión" va alineado con su texto', async ({ page }) => {
    // Nada sale a internet durante la prueba.
    await page.route(/^https:\/\/(login\.microsoftonline\.com|graph\.microsoft\.com)\//, (r) => r.abort());
    await usarConfigPruebas(page, {
      modo: 'microsoft',
      microsoft: { clientId: '11111111-2222-3333-4444-555555555555', tenantId: 'aaaaaaaa-0000-0000-0000-000000000001' },
    });
    await page.goto('/ordenes');
    await expect(page.locator('#btn-login')).toBeVisible();
    const m = await desfase(page, '#btn-login svg', '#btn-login');
    expect(m.tamano).toEqual([18, 18]);
    expect(m.desfase).toBeLessThanOrEqual(1.5);
  });

  test('3. íconos del mismo tamaño y alineados con su texto', async ({ page }) => {
    await abrir(page, '/ordenes?q=cn-000');
    const casos: [string, string, string][] = [
      ['Actualizar', '#btn-actualizar svg', '#btn-actualizar'],
      ['Exportar', '#btn-exportar svg', '#btn-exportar'],
      ['Página siguiente', '[aria-label="Página siguiente"] svg', '[aria-label="Página siguiente"]'],
      ['orden de la columna Código', '[data-orden="codigoCentro"] svg', '[data-orden="codigoCentro"]'],
      ['copiar junto al código', '.celda-codigo .btn-copiar svg', '.celda-codigo .codigo'],
      ['lupa del buscador', '.icono-lupa', '#buscador'],
      ['"×" del buscador', '#btn-borrar-busqueda svg', '#buscador'],
      ['tema ☀️/🌙', '#btn-tema .icono-luna', '#btn-tema'],
    ];
    for (const [nombre, icono, texto] of casos) {
      const m = await desfase(page, icono, texto);
      expect(m.tamano[0], nombre).toBeGreaterThanOrEqual(16);
      expect(m.tamano[0], nombre).toBeLessThanOrEqual(18);
      expect(m.tamano[1], nombre).toBe(m.tamano[0]);
      expect(m.desfase, nombre).toBeLessThanOrEqual(1.5);
    }
    // El código (con su botón copiar) queda en la misma línea que el texto de las demás celdas de la fila.
    const fila = await desfase(page, '#tabla-resultados tbody tr td:nth-child(1) .codigo', '#tabla-resultados tbody tr td:nth-child(5)');
    expect(fila.desfase).toBeLessThanOrEqual(2);

    // Desplegables: flecha propia (SVG), igual en todos.
    for (const selector of ['#f-cliente', '#f-tipo', '#f-estado', '#tam-pagina']) {
      const estilo = await page.locator(selector).evaluate((el) => {
        const e = getComputedStyle(el);
        return { apariencia: e.appearance, fondo: e.backgroundImage };
      });
      expect(estilo.apariencia, selector).toBe('none');
      expect(estilo.fondo, selector).toContain('data:image/svg+xml');
    }

    // "Por centro": la flecha para abrir un centro, alineada con el código de su fila.
    await page.getByRole('radio', { name: 'Por centro de negocio' }).check();
    const expandir = await desfase(page, '.fila-centro .btn-expandir svg', '.fila-centro .codigo');
    expect(expandir.tamano).toEqual([16, 16]);
    expect(expandir.desfase).toBeLessThanOrEqual(2);
  });

  test('3. en el celular el botón "Filtros" también lleva su ícono alineado', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await abrir(page, '/ordenes');
    const m = await desfase(page, '#btn-mostrar-filtros svg', '#btn-mostrar-filtros');
    expect(m.tamano).toEqual([16, 16]);
    expect(m.desfase).toBeLessThanOrEqual(1.5);
  });
});
