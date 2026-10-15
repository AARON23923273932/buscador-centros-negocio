// Cambios de diseño pedidos por el supervisor (Gustavo), medidos en Chromium:
//   1. Más margen a los lados (14/10/2026 y otra vez 15/10/2026: "creo que podría ser un poco más"): el contenido
//      va en una columna de 1120 px como máximo, con un margen lateral del 6 % del ancho (entre 20 y 96 px).
//   2. Contornos menos agresivos: bordes de 1 px y un anillo al llegar con el teclado (no con el mouse), que
//      contrasta al menos 3:1 con el fondo en claro y en oscuro. Desde el 15/10/2026 los colores son los de la
//      guía de estilo de AIC (sin transparencias): borde Primary Blue + anillo Medium Blue (en oscuro: Light Blue
//      + Border Gray). Los componentes son de shadcn/ui; el anillo es un box-shadow.
//   3. Íconos alineados con su texto (mismo tamaño, desfase vertical de 1 px o menos).
import { expect, test, type Page } from '@playwright/test';
import { abrir } from './ayuda.ts';
import { usarConfigPruebas } from './config-pruebas.ts';

test.beforeEach(async ({ context }) => {
  await usarConfigPruebas(context);
});

/** Colores de la guía de AIC como los devuelve getComputedStyle. */
const PRIMARY_BLUE = 'rgb(30, 58, 110)';
const MEDIUM_BLUE = 'rgb(59, 107, 170)';
const LIGHT_BLUE = 'rgb(232, 238, 245)';
const BORDER_GRAY = 'rgb(204, 204, 204)';
const WHITE = 'rgb(255, 255, 255)';
/** Anillo de foco: 2 px sólidos alrededor (claro: Medium Blue; oscuro: Border Gray). */
const ANILLO_CLARO = `${MEDIUM_BLUE} 0px 0px 0px 2px`;
const ANILLO_OSCURO = `${BORDER_GRAY} 0px 0px 0px 2px`;

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

/** Lleva el foco a un control CON EL TECLADO (Shift+Tab y Tab), como lo haría una persona. */
async function llegarConTeclado(page: Page, selector: string) {
  await page.locator(selector).first().focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator(selector).first()).toBeFocused();
}

/** Borde, sombra (anillo) y :focus-visible del elemento con el foco. */
const estiloFoco = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement!;
    const e = getComputedStyle(el);
    return { visible: el.matches(':focus-visible'), borde: e.borderTopColor, sombra: e.boxShadow };
  });

/** Contraste (WCAG) del anillo de foco (--ring) dibujado sobre el fondo de la página y sobre las tarjetas. */
const contrastesAnillo = (page: Page) =>
  page.evaluate(() => {
    const rgba = (texto: string) => {
      const prueba = document.createElement('div');
      prueba.style.color = texto;
      document.body.append(prueba);
      const valores = getComputedStyle(prueba).color.match(/[\d.]+/g)!.map(Number);
      prueba.remove();
      return [valores[0]!, valores[1]!, valores[2]!, valores[3] ?? 1];
    };
    const variable = (nombre: string) => {
      const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
      if (!valor) throw new Error(`Falta la variable de CSS ${nombre}`); // (si no, se compararía con el color heredado)
      return rgba(valor);
    };
    const luz = ([r, g, b]: number[]) => {
      const lineal = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * lineal(r!) + 0.7152 * lineal(g!) + 0.0722 * lineal(b!);
    };
    const contraste = (a: number[], b: number[]) => {
      const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m);
      return (x! + 0.05) / (y! + 0.05);
    };
    const anillo = variable('--ring');
    const sobre = (fondo: number[]) => fondo.slice(0, 3).map((c, i) => anillo[3]! * anillo[i]! + (1 - anillo[3]!) * c);
    const fondo = variable('--background');
    const tarjeta = variable('--card');
    return { fondo: contraste(sobre(fondo), fondo), tarjeta: contraste(sobre(tarjeta), tarjeta) };
  });

test.describe('Diseño (pedido del supervisor)', () => {
  test('1. más margen a los lados: el contenido va centrado, con 1120 px como máximo y un margen del 6 % del ancho', async ({ page }) => {
    for (const ancho of [1920, 1440, 1280, 1024]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await abrir(page, '/ordenes');
      const m = await page.evaluate(() => {
        const contenido = document.querySelector('#pantalla-app')!.getBoundingClientRect();
        const logo = document.querySelector('.cabecera .logo')!.getBoundingClientRect();
        const cabecera = document.querySelector('.cabecera')!.getBoundingClientRect();
        const visible = document.documentElement.clientWidth; // sin la barra de desplazamiento
        const margen = parseFloat(getComputedStyle(document.querySelector('#principal')!).paddingLeft);
        return { izq: contenido.left, der: visible - contenido.right, ancho: contenido.width, logo: logo.left, cabecera: cabecera.width, visible, margen };
      });
      const esperado = Math.min(96, Math.max(20, ancho * 0.06)); // clamp(20px, 6vw, 96px)
      expect(m.margen, `margen a ${ancho} px`).toBeCloseTo(esperado, 0);
      expect(Math.round(m.ancho), `ancho a ${ancho} px`).toBeLessThanOrEqual(1120); // antes: 1240
      expect(m.izq).toBeGreaterThanOrEqual(esperado - 0.5); // a 1280 px: antes 51 px, ahora 80 px
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

  test('1. entre 400 y 719 px (celular horizontal, ventana angosta): el margen crece sin saltos y nunca es menor que antes', async ({ page }) => {
    const medir = async (ancho: number) => {
      await page.setViewportSize({ width: ancho, height: 700 });
      await abrir(page, '/ordenes');
      return page.evaluate(() => ({
        margen: parseFloat(getComputedStyle(document.querySelector('#principal')!).paddingLeft),
        buscador: document.querySelector('#form-busqueda')!.getBoundingClientRect().left,
        pagina: document.documentElement.scrollWidth,
        ventana: document.documentElement.clientWidth,
      }));
    };
    let anterior = 0;
    for (const ancho of [375, 400, 480, 600, 667, 700, 719]) {
      const m = await medir(ancho);
      const esperado = Math.max(16, 0.085 * ancho - 18); // max(16px, 8.5vw - 18px)
      expect(m.margen, `margen a ${ancho} px`).toBeCloseTo(esperado, 0);
      expect(m.margen, `a ${ancho} px no es menor que antes (clamp(16px, 4vw, 56px))`).toBeGreaterThanOrEqual(Math.max(16, ancho * 0.04) - 0.1);
      expect(m.margen, `a ${ancho} px no baja al agrandar la ventana`).toBeGreaterThanOrEqual(anterior);
      expect(m.buscador).toBeCloseTo(m.margen, 0); // el buscador empieza donde termina el margen
      expect(m.pagina, `sin scroll horizontal a ${ancho} px`).toBeLessThanOrEqual(m.ventana);
      anterior = m.margen;
    }
    // Sin salto al pasar de 719 a 720 px (antes de este ajuste: de 16 px a 43,2 px).
    const a720 = await medir(720);
    expect(a720.margen).toBeCloseTo(43.2, 0);
    expect(a720.margen - anterior).toBeLessThan(1);
  });

  test('2. contornos suaves: bordes de 1 px; anillo de foco solo con el teclado', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    // (#panel-filtros: antes se buscaba por su clase "filtros", que ya no existe; es el mismo <fieldset>.)
    for (const selector of ['#buscador', '#f-cliente', '#f-codigo', '#tam-pagina', '#btn-exportar', '#contenedor-tabla', '#panel-filtros']) {
      expect(await page.locator(selector).evaluate((el) => getComputedStyle(el).borderTopWidth), selector).toBe('1px');
    }

    // Con el mouse: sin anillo.
    const actualizar = page.getByRole('button', { name: 'Actualizar' });
    await actualizar.click();
    await expect(actualizar).toBeFocused();
    const conMouse = await actualizar.evaluate((b) => ({ visible: b.matches(':focus-visible'), sombra: getComputedStyle(b).boxShadow }));
    expect(conMouse.visible).toBe(false);
    expect(conMouse.sombra).toBe('none');

    // Con el teclado: borde primario + anillo de 2 px (no el contorno de 3 px de antes).
    await page.getByLabel('Filas por página').focus();
    await page.keyboard.press('Tab');
    const exportar = page.getByRole('button', { name: 'Exportar a Excel' });
    await expect(exportar).toBeFocused();
    const conTeclado = await exportar.evaluate((b) => {
      const e = getComputedStyle(b);
      return { visible: b.matches(':focus-visible'), sombra: e.boxShadow, borde: e.borderTopColor, contorno: e.outlineColor };
    });
    expect(conTeclado.visible).toBe(true);
    expect(conTeclado.sombra).toBe(ANILLO_CLARO);
    expect(conTeclado.borde).toBe(PRIMARY_BLUE);
    expect(conTeclado.contorno).toBe('rgba(0, 0, 0, 0)'); // transparente: solo se ve en alto contraste de Windows
    // El anillo se distingue: al menos 3:1 con el fondo de la página y con el blanco de las tarjetas.
    const contraste = await contrastesAnillo(page);
    expect(contraste.fondo).toBeGreaterThanOrEqual(3);
    expect(contraste.tarjeta).toBeGreaterThanOrEqual(3);

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

    // Con el teclado: borde Light Blue y anillo Border Gray (se distinguen sobre el fondo negro del modo oscuro).
    await page.getByLabel('Filas por página').focus();
    await page.keyboard.press('Tab');
    const exportar = page.getByRole('button', { name: 'Exportar a Excel' });
    await expect(exportar).toBeFocused();
    const conTeclado = await exportar.evaluate((b) => {
      const e = getComputedStyle(b);
      return { visible: b.matches(':focus-visible'), sombra: e.boxShadow, borde: e.borderTopColor };
    });
    expect(conTeclado.visible).toBe(true);
    expect(conTeclado.sombra).toBe(ANILLO_OSCURO);
    expect(conTeclado.borde).toBe(LIGHT_BLUE);
    const contraste = await contrastesAnillo(page);
    expect(contraste.fondo).toBeGreaterThanOrEqual(3);
    expect(contraste.tarjeta).toBeGreaterThanOrEqual(3);

    // El botón "copiar" de cada fila: el mismo borde azul con el teclado.
    await llegarConTeclado(page, '#tabla-resultados .btn-copiar');
    expect(await estiloFoco(page)).toEqual({ visible: true, borde: LIGHT_BLUE, sombra: ANILLO_OSCURO });

    // Enlace del código: contorno de 2 px del mismo color que el anillo.
    await page.getByRole('link', { name: 'CN-0001' }).first().focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const enlace = await page.evaluate(() => {
      const e = getComputedStyle(document.activeElement!);
      return { ancho: e.outlineWidth, estilo: e.outlineStyle, color: e.outlineColor };
    });
    expect(enlace).toEqual({ ancho: '2px', estilo: 'solid', color: BORDER_GRAY });
  });

  test('2. el foco se ve en TODOS los controles con borde: "copiar" de cada fila y botón principal', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    // "Copiar" (uno por fila: lo que más se recorre con Tab): borde azul + anillo, como los demás.
    await llegarConTeclado(page, '#tabla-resultados .btn-copiar');
    expect(await estiloFoco(page)).toEqual({ visible: true, borde: PRIMARY_BLUE, sombra: ANILLO_CLARO });
    // Con el mouse, solo el borde gris (Border Gray) del :hover, sin anillo.
    await page.locator('#tabla-resultados .btn-copiar').nth(1).hover();
    const conMouse = await page.locator('#tabla-resultados .btn-copiar').nth(1).evaluate((b) => getComputedStyle(b).borderTopColor);
    expect(conMouse).toBe(BORDER_GRAY);

    // Botón principal ("Ir al buscador", "Iniciar sesión"): su borde ya es azul, así que el anillo va separado
    // del botón por una línea blanca (el color de la tarjeta) y es sólido.
    await page.goto('/no-existe');
    await llegarConTeclado(page, '#enlace-ir-al-buscador');
    expect(await estiloFoco(page)).toEqual({
      visible: true,
      borde: PRIMARY_BLUE,
      sombra: `${WHITE} 0px 0px 0px 2px, ${MEDIUM_BLUE} 0px 0px 0px 4px`,
    });
  });

  test('2. con el mouse ENCIMA de un control que tiene el foco del teclado, el borde sigue azul', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    for (const selector of ['#f-cliente', '#f-codigo', '#tam-pagina', '#btn-tema', '#tabla-resultados .btn-copiar']) {
      await llegarConTeclado(page, selector);
      await page.locator(selector).first().hover();
      expect(await estiloFoco(page), selector).toEqual({ visible: true, borde: PRIMARY_BLUE, sombra: ANILLO_CLARO });
    }
    await page.getByRole('radio', { name: 'Por centro de negocio' }).check();
    await llegarConTeclado(page, '.fila-centro .btn-expandir');
    await page.locator('.fila-centro .btn-expandir').first().hover();
    expect((await estiloFoco(page)).borde).toBe(PRIMARY_BLUE);
  });

  test('2. al hacer CLIC en una caja de texto o un desplegable no aparece el anillo (sí con Tab)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    for (const selector of ['#buscador', '#f-codigo', '#f-cliente', '#tam-pagina']) {
      await page.locator(selector).click();
      if (selector.startsWith('#f-cliente') || selector === '#tam-pagina') await page.keyboard.press('Escape'); // cierra la lista
      await expect(page.locator(selector)).toBeFocused();
      // Solo el borde azul (dice dónde se escribe o qué se eligió), sin el anillo.
      expect(await estiloFoco(page), selector).toMatchObject({ borde: PRIMARY_BLUE, sombra: 'none' });
    }
    // Escribir no hace aparecer el anillo a la mitad.
    await page.locator('#f-codigo').click();
    await page.keyboard.type('cn');
    expect((await estiloFoco(page)).sombra).toBe('none');
    // Con Tab, el anillo vuelve.
    await page.keyboard.press('Tab');
    expect((await estiloFoco(page)).sombra).toBe(ANILLO_CLARO);
    await llegarConTeclado(page, '#f-cliente');
    expect(await estiloFoco(page)).toEqual({ visible: true, borde: PRIMARY_BLUE, sombra: ANILLO_CLARO });
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
    expect(m.desfase).toBeLessThanOrEqual(1);
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
      expect(m.desfase, nombre).toBeLessThanOrEqual(1);
    }
    // El código (con su botón copiar) queda en la misma línea que el texto de las demás celdas de la fila. Va en
    // letra monoespaciada más chica, así que se compara la BASE de las letras (la línea donde se apoyan), no el
    // centro: un elemento vacío "inline-block" se apoya justo en esa línea.
    const bases = await page.evaluate(() => {
      const base = (el: Element) => {
        const marca = document.createElement('span');
        marca.style.cssText = 'display:inline-block;width:0;height:0';
        el.prepend(marca);
        const y = marca.getBoundingClientRect().bottom;
        marca.remove();
        return y;
      };
      const fila = document.querySelector('#tabla-resultados tbody tr')!;
      return Math.abs(base(fila.querySelector('td:nth-child(1) .codigo')!) - base(fila.querySelector('td:nth-child(5)')!));
    });
    expect(bases).toBeLessThanOrEqual(1);

    // Desplegables (NativeSelect de shadcn/ui): flecha propia, igual en todos. Antes era una imagen de fondo del
    // <select>; ahora es un ícono SVG de 16 px junto al <select>, dentro de la caja y centrado en su altura.
    for (const selector of ['#f-cliente', '#f-tipo', '#f-estado', '#tam-pagina']) {
      const estilo = await page.locator(selector).evaluate((el) => {
        const flecha = el.parentElement!.querySelector('svg[data-slot="native-select-icon"]')!.getBoundingClientRect();
        const caja = el.getBoundingClientRect();
        const centro = (r: DOMRect) => r.top + r.height / 2;
        return {
          apariencia: getComputedStyle(el).appearance,
          tamano: [flecha.width, flecha.height],
          desfase: Math.abs(centro(flecha) - centro(caja)),
          dentro: flecha.left > caja.left && flecha.right <= caja.right,
        };
      });
      expect(estilo.apariencia, selector).toBe('none');
      expect(estilo.tamano, selector).toEqual([16, 16]);
      expect(estilo.desfase, selector).toBeLessThanOrEqual(1);
      expect(estilo.dentro, selector).toBe(true);
    }

    // "Por centro": la flecha para abrir un centro, alineada con el código de su fila.
    await page.getByRole('radio', { name: 'Por centro de negocio' }).check();
    const expandir = await desfase(page, '.fila-centro .btn-expandir svg', '.fila-centro .codigo');
    expect(expandir.tamano).toEqual([16, 16]);
    expect(expandir.desfase).toBeLessThanOrEqual(1);
    // …y la fila no se hace más alta por el botón (mismo alto que una fila sin él).
    const altos = await page.evaluate(() => {
      const fila = document.querySelector('.fila-centro')!;
      const alto = fila.getBoundingClientRect().height;
      fila.querySelector<HTMLElement>('.btn-expandir')!.style.display = 'none';
      const sinBoton = fila.getBoundingClientRect().height;
      fila.querySelector<HTMLElement>('.btn-expandir')!.style.display = '';
      return { alto, sinBoton };
    });
    expect(altos.alto).toBe(altos.sinBoton);
  });

  test('3. en el celular el botón "Filtros" también lleva su ícono alineado', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await abrir(page, '/ordenes');
    const m = await desfase(page, '#btn-mostrar-filtros svg', '#btn-mostrar-filtros');
    expect(m.tamano).toEqual([16, 16]);
    expect(m.desfase).toBeLessThanOrEqual(1);
  });
});
