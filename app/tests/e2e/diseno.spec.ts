// Cambios de diseño pedidos por el supervisor (Gustavo), medidos en Chromium:
//   1. Más margen a los lados (14/10/2026 y otra vez 15/10/2026: "creo que podría ser un poco más"): el contenido
//      va en una columna de 1120 px como máximo, con un margen lateral del 6 % del ancho (entre 20 y 96 px).
//   2. Contornos suaves y foco visible con el teclado. Desde el último pedido del 15/10/2026 ("que use los estilos
//      naturales de shadcn … sin cambios, solo agregando el estilo de marca") son los de shadcn/ui tal cual: bordes de
//      1 px y, con el teclado (:focus-visible), el borde pasa al color del anillo (--ring, Medium Blue) más un anillo
//      de 3 px de ese color al 50 % (focus-visible:border-ring ring-3 ring-ring/50). El color --ring contrasta al menos
//      3:1 con el fondo en claro y en oscuro. En los botones el anillo aparece solo con el teclado; en las cajas de texto
//      y desplegables, como en shadcn/ui, también al hacer clic (el navegador las marca :focus-visible).
//   3. Íconos alineados con su texto (mismo tamaño, desfase vertical de 1 px o menos).
import { expect, test, type Page } from '@playwright/test';
import { abrir } from './ayuda.ts';
import { al, PALETA, prepararColores } from './colores.ts';
import { usarConfigPruebas } from './config-pruebas.ts';

test.beforeEach(async ({ context }) => {
  await usarConfigPruebas(context);
  await prepararColores(context);
});

/** Anillo de foco de shadcn/ui: --ring (Medium Blue, en claro y en oscuro) al 50 %, 3 px alrededor. */
const ANILLO = al(PALETA.mediumBlue, 0.5);

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

/**
 * Borde, anillo de foco de shadcn/ui (o "ninguno") y :focus-visible del elemento con el foco. Primero termina la
 * transición del componente (transition-all de shadcn/ui: el anillo aparece de a poco).
 */
const estiloFoco = (page: Page) =>
  page.evaluate(async () => {
    const el = document.activeElement!;
    await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => {})));
    const e = getComputedStyle(el);
    const anillo = window.sombrasDe(e.boxShadow).find((s) => s.medidas === '0px 0px 0px 3px');
    return { visible: el.matches(':focus-visible'), borde: window.normalizarColor(e.borderTopColor), anillo: anillo?.color ?? 'ninguno' };
  });

/** Estado de foco esperado con el teclado: borde --ring y anillo de shadcn/ui. */
const CON_TECLADO = { visible: true, borde: PALETA.mediumBlue, anillo: ANILLO };

/** Contraste (WCAG) del color del anillo (--ring) sobre el fondo de la página y sobre las tarjetas. */
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

  test('2. contornos suaves: bordes de 1 px; anillo de foco de shadcn/ui solo con el teclado', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    // (#panel-filtros: antes se buscaba por su clase "filtros", que ya no existe; es el mismo <fieldset>.)
    for (const selector of ['#buscador', '#f-cliente', '#f-codigo', '#tam-pagina', '#btn-exportar', '#panel-filtros']) {
      expect(await page.locator(selector).evaluate((el) => getComputedStyle(el).borderTopWidth), selector).toBe('1px');
    }
    // #contenedor-tabla ahora es una Card de shadcn/ui: su contorno de 1 px es un "ring-1" (sombra), no un borde.
    const contornoCaja = await page.locator('#contenedor-tabla').evaluate((el) => window.sombrasDe(getComputedStyle(el).boxShadow));
    expect(contornoCaja).toContainEqual({ color: al(PALETA.black, 0.1), medidas: '0px 0px 0px 1px' });

    // Con el mouse: sin anillo.
    const actualizar = page.getByRole('button', { name: 'Actualizar' });
    await actualizar.click();
    await expect(actualizar).toBeFocused();
    expect(await estiloFoco(page)).toMatchObject({ visible: false, anillo: 'ninguno' });

    // Con el teclado: el borde pasa al color --ring y aparece el anillo de 3 px (focus-visible:border-ring ring-3 ring-ring/50).
    await page.getByLabel('Filas por página').focus();
    await page.keyboard.press('Tab');
    const exportar = page.getByRole('button', { name: 'Exportar a Excel' });
    await expect(exportar).toBeFocused();
    expect(await estiloFoco(page)).toEqual(CON_TECLADO);
    // El color del anillo se distingue: al menos 3:1 con el fondo de la página y con el de las tarjetas.
    const contraste = await contrastesAnillo(page);
    expect(contraste.fondo).toBeGreaterThanOrEqual(3);
    expect(contraste.tarjeta).toBeGreaterThanOrEqual(3);
    // Alto contraste de Windows (forced-colors): ahí no se dibujan sombras; un contorno de 2 px toma el lugar del anillo
    // (regla de estilos.css que solo se aplica en ese modo).
    expect(await exportar.evaluate((b) => getComputedStyle(b).outlineStyle)).toBe('none'); // modo normal: el de shadcn/ui
    await page.emulateMedia({ forcedColors: 'active' });
    expect(await exportar.evaluate((b) => ({ estilo: getComputedStyle(b).outlineStyle, ancho: getComputedStyle(b).outlineWidth }))).toEqual({
      estilo: 'solid',
      ancho: '2px',
    });
    await page.emulateMedia({ forcedColors: 'none' });

    // Enlaces (no son componentes de shadcn/ui, no tienen borde): contorno de 2 px del color --ring.
    await page.getByRole('link', { name: 'CN-0001' }).first().focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const enlace = await page.evaluate(() => {
      const e = getComputedStyle(document.activeElement!);
      return { clase: document.activeElement!.className, ancho: e.outlineWidth, estilo: e.outlineStyle, color: window.normalizarColor(e.outlineColor) };
    });
    expect(enlace).toEqual({ clase: 'codigo enlace-codigo', ancho: '2px', estilo: 'solid', color: PALETA.mediumBlue });
  });

  test('2. en modo oscuro el anillo de foco también se ve con el teclado (y no con el mouse)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await abrir(page, '/ordenes');
    expect(await page.evaluate(() => document.documentElement.dataset.temaEfectivo)).toBe('oscuro');

    const actualizar = page.getByRole('button', { name: 'Actualizar' });
    await actualizar.click();
    expect(await estiloFoco(page)).toMatchObject({ visible: false, anillo: 'ninguno' });

    // Con el teclado: borde y anillo Medium Blue (--ring también en oscuro: 3,9:1 sobre el negro).
    await page.getByLabel('Filas por página').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Exportar a Excel' })).toBeFocused();
    expect(await estiloFoco(page)).toEqual(CON_TECLADO);
    const contraste = await contrastesAnillo(page);
    expect(contraste.fondo).toBeGreaterThanOrEqual(3);
    expect(contraste.tarjeta).toBeGreaterThanOrEqual(3);

    // El botón "copiar" de cada fila: lo mismo con el teclado.
    await llegarConTeclado(page, '#tabla-resultados .btn-copiar');
    expect(await estiloFoco(page)).toEqual(CON_TECLADO);

    // Enlace del código: contorno de 2 px del mismo color que el anillo.
    await page.getByRole('link', { name: 'CN-0001' }).first().focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const enlace = await page.evaluate(() => {
      const e = getComputedStyle(document.activeElement!);
      return { ancho: e.outlineWidth, estilo: e.outlineStyle, color: window.normalizarColor(e.outlineColor) };
    });
    expect(enlace).toEqual({ ancho: '2px', estilo: 'solid', color: PALETA.mediumBlue });
  });

  test('2. el foco se ve en TODOS los controles: "copiar" de cada fila, botón principal y títulos que ordenan', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    // "Copiar" (uno por fila: lo que más se recorre con Tab): borde --ring + anillo, como los demás.
    await llegarConTeclado(page, '#tabla-resultados .btn-copiar');
    expect(await estiloFoco(page)).toEqual(CON_TECLADO);
    // Con el mouse encima de otro "copiar": el fondo Light Gray del Button "ghost" de shadcn/ui, sin anillo.
    const otro = page.locator('#tabla-resultados .btn-copiar').nth(1);
    await otro.hover();
    await expect
      .poll(() => otro.evaluate((b) => ({ fondo: window.normalizarColor(getComputedStyle(b).backgroundColor), sombras: window.sombrasDe(getComputedStyle(b).boxShadow) })))
      .toEqual({ fondo: PALETA.lightGray, sombras: [] });

    // Título que ordena (botón propio dentro del encabezado Primary Blue): contorno de 2 px del color de su texto
    // (blanco: 11,1:1 sobre Primary Blue), por dentro de la celda.
    await llegarConTeclado(page, '[data-orden="codigoCentro"]');
    const titulo = await page.evaluate(() => {
      const e = getComputedStyle(document.activeElement!);
      return { estilo: e.outlineStyle, ancho: e.outlineWidth, color: window.normalizarColor(e.outlineColor), separacion: e.outlineOffset };
    });
    expect(titulo).toEqual({ estilo: 'solid', ancho: '2px', color: PALETA.white, separacion: '-4px' });

    // Botón principal ("Ir al buscador", "Iniciar sesión"): el mismo borde y anillo de shadcn/ui.
    await page.goto('/no-existe');
    await llegarConTeclado(page, '#enlace-ir-al-buscador');
    expect(await estiloFoco(page)).toEqual(CON_TECLADO);
  });

  test('2. con el mouse ENCIMA de un control que tiene el foco del teclado, el borde y el anillo no cambian', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    for (const selector of ['#f-cliente', '#f-codigo', '#tam-pagina', '#btn-tema', '#tabla-resultados .btn-copiar']) {
      await llegarConTeclado(page, selector);
      await page.locator(selector).first().hover();
      expect(await estiloFoco(page), selector).toEqual(CON_TECLADO);
    }
    await page.getByRole('radio', { name: 'Por centro de negocio' }).check();
    await llegarConTeclado(page, '.fila-centro .btn-expandir');
    await page.locator('.fila-centro .btn-expandir').first().hover();
    expect(await estiloFoco(page)).toEqual(CON_TECLADO);
  });

  test('2. el anillo sigue a :focus-visible, como en shadcn/ui: botones solo con Tab; cajas de texto y desplegables también con el clic', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    // Botones (también la opción elegida de "Por orden / Por centro"): al hacer clic no aparece el anillo.
    for (const selector of ['#btn-actualizar', '[role="radio"][aria-checked="true"]', '#btn-exportar']) {
      await page.locator(selector).first().click();
      await expect(page.locator(selector).first()).toBeFocused();
      expect(await estiloFoco(page), selector).toMatchObject({ visible: false, anillo: 'ninguno' });
    }
    // Cajas de texto y desplegables: Chromium los marca :focus-visible también con el clic (dice dónde se escribe) y
    // el componente de shadcn/ui muestra su anillo (antes la app lo quitaba con logica/modalidad.ts y una regla propia).
    for (const selector of ['#buscador', '#f-codigo', '#f-cliente', '#tam-pagina']) {
      await page.locator(selector).click();
      if (selector === '#f-cliente' || selector === '#tam-pagina') await page.keyboard.press('Escape'); // cierra la lista
      await expect(page.locator(selector)).toBeFocused();
      const foco = await estiloFoco(page);
      expect(foco.anillo !== 'ninguno', selector).toBe(foco.visible);
      if (selector === '#buscador' || selector === '#f-codigo') expect(foco, selector).toEqual(CON_TECLADO);
    }
    // Con Tab, el anillo siempre.
    await page.keyboard.press('Tab');
    expect(await estiloFoco(page)).toEqual(CON_TECLADO);
    await llegarConTeclado(page, '#f-cliente');
    expect(await estiloFoco(page)).toEqual(CON_TECLADO);
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
