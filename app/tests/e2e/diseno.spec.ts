import { expect, test, type Page } from '@playwright/test';
import { abrir } from './ayuda.ts';
import { al, PALETA, prepararColores, TONOS_OSCURO } from './colores.ts';
import { usarConfigPruebas } from './config-pruebas.ts';

test.beforeEach(async ({ context }) => {
  await usarConfigPruebas(context);
  await prepararColores(context);
});

const RING = { claro: PALETA.mediumBlue, oscuro: TONOS_OSCURO.anillo } as const;

async function desfase(page: Page, selectorIcono: string, selectorTexto: string): Promise<{ tamano: number[]; desfase: number }> {
  return page.evaluate(
    ([si, st]) => {
      const icono = document.querySelector(si)!.getBoundingClientRect();
      const el = document.querySelector(st)!;
      const recorrido = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) =>
          n.textContent?.trim() && !n.parentElement?.closest('.sr-only') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
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

async function llegarConTeclado(page: Page, selector: string) {
  await page.locator(selector).first().focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator(selector).first()).toBeFocused();
}

const estiloFoco = (page: Page) =>
  page.evaluate(async () => {
    const el = document.activeElement!;
    await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => {})));
    const e = getComputedStyle(el);
    const anillo = window.sombrasDe(e.boxShadow).find((s) => s.medidas === '0px 0px 0px 3px');
    return { visible: el.matches(':focus-visible'), borde: window.normalizarColor(e.borderTopColor), anillo: anillo?.color ?? 'ninguno' };
  });

const conTeclado = (ring: string) => ({ visible: true, borde: ring, anillo: al(ring, 0.5) });
const CON_TECLADO = conTeclado(RING.claro);
const CON_TECLADO_OSCURO = conTeclado(RING.oscuro);
const CON_TECLADO_OSCURO_OUTLINE = { visible: true, borde: TONOS_OSCURO.bordeCaja, anillo: al(RING.oscuro, 0.5) };

const FONDOS = ['--background', '--card', '--muted'];
const FONDOS_Y_FILA_CON_MOUSE = [...FONDOS, '--accent'];

const contrastesFoco = (page: Page, fondosAlrededor = FONDOS) =>
  page.evaluate((variables) => {
    const e = getComputedStyle(document.activeElement!);
    const partes = (normalizado: string) => {
      const [rgb, alfa] = normalizado.split(' / ');
      return { canales: (rgb!.match(/\d+/g) ?? []).map(Number), alfa: alfa === undefined ? 1 : Number(alfa) };
    };
    const variable = (nombre: string) => {
      const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
      if (!valor) throw new Error(`Falta la variable de CSS ${nombre}`);
      return partes(window.normalizarColor(valor)).canales;
    };
    const luz = ([r, g, b]: number[]) => {
      const lineal = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * lineal(r!) + 0.7152 * lineal(g!) + 0.0722 * lineal(b!);
    };
    const contraste = (a: number[], b: number[]) => {
      const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m);
      return (x! + 0.05) / (y! + 0.05);
    };
    type Color = { canales: number[]; alfa: number };
    const sobre = ({ canales, alfa }: Color, fondo: number[]) => canales.map((v, i) => alfa * v + (1 - alfa) * fondo[i]!);
    const anillo = window.sombrasDe(e.boxShadow).find((s) => s.medidas === '0px 0px 0px 3px');
    if (!anillo) throw new Error('El control con el foco no tiene el anillo de 3 px');
    const borde = partes(window.normalizarColor(e.borderTopColor));
    const halo = partes(anillo.color);
    const fondos = variables.map(variable);
    const menor = (color: Color) => Math.min(...fondos.map((fondo) => contraste(sobre(color, fondo), fondo)));
    return { borde: menor(borde), anillo: menor(halo), alfaAnillo: halo.alfa };
  }, fondosAlrededor);

test.describe('Diseño (pedido del supervisor)', () => {
  test('1. más margen a los lados: el contenido va centrado, con 1120 px como máximo y un margen del 6 % del ancho', async ({ page }) => {
    for (const ancho of [1920, 1440, 1280, 1024]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await abrir(page, '/ordenes');
      const m = await page.evaluate(() => {
        const contenido = document.querySelector('#pantalla-app')!.getBoundingClientRect();
        const logo = document.querySelector('.cabecera .logo')!.getBoundingClientRect();
        const cabecera = document.querySelector('.cabecera')!.getBoundingClientRect();
        const visible = document.documentElement.clientWidth;
        const margen = parseFloat(getComputedStyle(document.querySelector('#principal')!).paddingLeft);
        return { izq: contenido.left, der: visible - contenido.right, ancho: contenido.width, logo: logo.left, cabecera: cabecera.width, visible, margen };
      });
      const esperado = Math.min(96, Math.max(20, ancho * 0.06));
      expect(m.margen, `margen a ${ancho} px`).toBeCloseTo(esperado, 0);
      expect(Math.round(m.ancho), `ancho a ${ancho} px`).toBeLessThanOrEqual(1120);
      expect(m.izq).toBeGreaterThanOrEqual(esperado - 0.5);
      expect(Math.abs(m.izq - m.der)).toBeLessThanOrEqual(1);
      expect(Math.abs(m.logo - m.izq)).toBeLessThanOrEqual(1);
      expect(m.cabecera).toBe(m.visible);
    }
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
      const esperado = Math.max(16, 0.085 * ancho - 18);
      expect(m.margen, `margen a ${ancho} px`).toBeCloseTo(esperado, 0);
      expect(m.margen, `a ${ancho} px no es menor que antes (clamp(16px, 4vw, 56px))`).toBeGreaterThanOrEqual(Math.max(16, ancho * 0.04) - 0.1);
      expect(m.margen, `a ${ancho} px no baja al agrandar la ventana`).toBeGreaterThanOrEqual(anterior);
      expect(m.buscador).toBeCloseTo(m.margen, 0);
      expect(m.pagina, `sin scroll horizontal a ${ancho} px`).toBeLessThanOrEqual(m.ventana);
      anterior = m.margen;
    }
    const a720 = await medir(720);
    expect(a720.margen).toBeCloseTo(43.2, 0);
    expect(a720.margen - anterior).toBeLessThan(1);
  });

  test('2. contornos suaves: bordes de 1 px; anillo de foco de shadcn/ui solo con el teclado', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    for (const selector of ['#buscador', '#f-cliente', '#f-codigo', '#tam-pagina', '#btn-exportar', '#panel-filtros']) {
      expect(await page.locator(selector).evaluate((el) => getComputedStyle(el).borderTopWidth), selector).toBe('1px');
    }
    const contornoCaja = await page.locator('#contenedor-tabla').evaluate((el) => window.sombrasDe(getComputedStyle(el).boxShadow));
    expect(contornoCaja).toContainEqual({ color: al(PALETA.black, 0.1), medidas: '0px 0px 0px 1px' });

    const actualizar = page.getByRole('button', { name: 'Actualizar' });
    await actualizar.click();
    await expect(actualizar).toBeFocused();
    expect(await estiloFoco(page)).toMatchObject({ visible: false, anillo: 'ninguno' });

    await page.getByLabel('Filas por página').focus();
    await page.keyboard.press('Tab');
    const exportar = page.getByRole('button', { name: 'Exportar a Excel' });
    await expect(exportar).toBeFocused();
    expect(await estiloFoco(page)).toEqual(CON_TECLADO);
    const contraste = await contrastesFoco(page);
    expect(contraste.alfaAnillo).toBe(0.5);
    expect(contraste.borde).toBeGreaterThanOrEqual(3);
    expect(contraste.anillo).toBeGreaterThanOrEqual(2);
    expect((await contrastesFoco(page, FONDOS_Y_FILA_CON_MOUSE)).borde).toBeGreaterThanOrEqual(3);
    expect(await exportar.evaluate((b) => getComputedStyle(b).outlineStyle)).toBe('none');
    await page.emulateMedia({ forcedColors: 'active' });
    expect(await exportar.evaluate((b) => ({ estilo: getComputedStyle(b).outlineStyle, ancho: getComputedStyle(b).outlineWidth }))).toEqual({
      estilo: 'solid',
      ancho: '2px',
    });
    await page.emulateMedia({ forcedColors: 'none' });

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
    expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

    const actualizar = page.getByRole('button', { name: 'Actualizar' });
    await actualizar.click();
    expect(await estiloFoco(page)).toMatchObject({ visible: false, anillo: 'ninguno' });

    await page.getByLabel('Filas por página').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Exportar a Excel' })).toBeFocused();
    expect(await estiloFoco(page)).toEqual(CON_TECLADO_OSCURO_OUTLINE);
    let contraste = await contrastesFoco(page, FONDOS_Y_FILA_CON_MOUSE);
    expect(contraste.alfaAnillo).toBe(0.5);
    expect(contraste.borde).toBeGreaterThanOrEqual(3);
    expect(contraste.anillo).toBeGreaterThanOrEqual(3);

    await llegarConTeclado(page, '#tabla-resultados > tbody > tr:nth-child(2) .btn-copiar');
    expect(await estiloFoco(page)).toEqual(CON_TECLADO_OSCURO);
    contraste = await contrastesFoco(page, FONDOS_Y_FILA_CON_MOUSE);
    expect(contraste.borde).toBeGreaterThanOrEqual(3);
    expect(contraste.anillo).toBeGreaterThanOrEqual(3);
    await llegarConTeclado(page, '#f-codigo');
    expect(await estiloFoco(page)).toEqual(CON_TECLADO_OSCURO);

    await page.getByRole('link', { name: 'CN-0001' }).first().focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const enlace = await page.evaluate(() => {
      const e = getComputedStyle(document.activeElement!);
      return { ancho: e.outlineWidth, estilo: e.outlineStyle, color: window.normalizarColor(e.outlineColor) };
    });
    expect(enlace).toEqual({ ancho: '2px', estilo: 'solid', color: RING.oscuro });
  });

  test('2. en modo oscuro, sobre la fila con el mouse encima, el borde del botón de expandir y su anillo de foco llegan a 3:1', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await abrir(page, '/centros');
    const fila = page.locator('.fila-centro').first();
    await llegarConTeclado(page, '.fila-centro .btn-expandir');
    await fila.locator('td').nth(2).hover();
    await expect.poll(() => fila.evaluate((el) => el.matches(':hover'))).toBe(true);
    const medida = await fila.evaluate(async (el) => {
      await Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => {})),
      );
      const partes = (normalizado: string) => {
        const [rgb, alfa] = normalizado.split(' / ');
        return { canales: (rgb!.match(/\d+/g) ?? []).map(Number), alfa: alfa === undefined ? 1 : Number(alfa) };
      };
      const luz = ([r, g, b]: number[]) => {
        const lineal = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        return 0.2126 * lineal(r!) + 0.7152 * lineal(g!) + 0.0722 * lineal(b!);
      };
      const contraste = (a: number[], b: number[]) => {
        const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m);
        return (x! + 0.05) / (y! + 0.05);
      };
      const sobre = ({ canales, alfa }: { canales: number[]; alfa: number }, fondo: number[]) => canales.map((v, i) => alfa * v + (1 - alfa) * fondo[i]!);
      const boton = el.querySelector('.btn-expandir')!;
      const e = getComputedStyle(boton);
      const fondo = window.normalizarColor(getComputedStyle(el).backgroundColor);
      const debajo = partes(fondo).canales;
      const anillo = window.sombrasDe(e.boxShadow).find((s) => s.medidas === '0px 0px 0px 3px');
      return {
        fondo,
        conFoco: boton === document.activeElement && boton.matches(':focus-visible'),
        borde: contraste(sobre(partes(window.normalizarColor(e.borderTopColor)), debajo), debajo),
        anillo: anillo ? contraste(sobre(partes(anillo.color), debajo), debajo) : 0,
      };
    });
    expect(medida).toMatchObject({ fondo: TONOS_OSCURO.filaMouse, conFoco: true });
    expect(medida.borde).toBeGreaterThanOrEqual(3);
    expect(medida.anillo).toBeGreaterThanOrEqual(3);
  });

  test('2. el foco se ve en TODOS los controles: "copiar" de cada fila, botón principal y títulos que ordenan', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    await llegarConTeclado(page, '#tabla-resultados .btn-copiar');
    expect(await estiloFoco(page)).toEqual(CON_TECLADO);
    const otro = page.locator('#tabla-resultados .btn-copiar').nth(1);
    await otro.hover();
    await expect
      .poll(() => otro.evaluate((b) => ({ fondo: window.normalizarColor(getComputedStyle(b).backgroundColor), sombras: window.sombrasDe(getComputedStyle(b).boxShadow) })))
      .toEqual({ fondo: PALETA.lightGray, sombras: [] });

    await llegarConTeclado(page, '[data-orden="codigoCentro"]');
    const titulo = await page.evaluate(() => {
      const e = getComputedStyle(document.activeElement!);
      return { estilo: e.outlineStyle, ancho: e.outlineWidth, color: window.normalizarColor(e.outlineColor), separacion: e.outlineOffset };
    });
    expect(titulo).toEqual({ estilo: 'solid', ancho: '2px', color: PALETA.white, separacion: '-4px' });

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
    for (const selector of ['#btn-actualizar', '[role="radio"][aria-checked="true"]', '#btn-exportar']) {
      await page.locator(selector).first().click();
      await expect(page.locator(selector).first()).toBeFocused();
      expect(await estiloFoco(page), selector).toMatchObject({ visible: false, anillo: 'ninguno' });
    }
    for (const selector of ['#buscador', '#f-codigo', '#f-cliente', '#tam-pagina']) {
      await page.locator('h1').click();
      await page.locator(selector).click();
      await expect(page.locator(selector)).toBeFocused();
      expect(await estiloFoco(page), selector).toEqual(CON_TECLADO);
      if (selector === '#f-cliente' || selector === '#tam-pagina') await page.keyboard.press('Escape');
    }
    await page.keyboard.press('Tab');
    expect(await estiloFoco(page)).toEqual(CON_TECLADO);
    await llegarConTeclado(page, '#f-cliente');
    expect(await estiloFoco(page)).toEqual(CON_TECLADO);
  });

  test('3. el logo de Microsoft del botón "Iniciar sesión" va alineado con su texto', async ({ page }) => {
    await page.route(/^https:\/\/(login\.microsoftonline\.com|graph\.microsoft\.com)\//, (r) => r.abort());
    await usarConfigPruebas(page, {
      modo: 'microsoft',
      microsoft: { clientId: '11111111-2222-3333-4444-555555555555', tenantId: 'aaaaaaaa-0000-0000-0000-000000000001' },
    });
    await page.goto('/ordenes');
    await expect(page.locator('#btn-login')).toBeVisible();
    const m = await desfase(page, '#btn-login svg', '#btn-login');
    expect(m.tamano).toEqual([20, 20]);
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
      ['tema', '#btn-tema svg', '#btn-tema'],
    ];
    for (const [nombre, icono, texto] of casos) {
      const m = await desfase(page, icono, texto);
      expect(m.tamano[0], nombre).toBeGreaterThanOrEqual(16);
      expect(m.tamano[0], nombre).toBeLessThanOrEqual(18);
      expect(m.tamano[1], nombre).toBe(m.tamano[0]);
      expect(m.desfase, nombre).toBeLessThanOrEqual(1);
    }
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

    await page.getByRole('radio', { name: 'Por centro de negocio' }).check();
    const expandir = await desfase(page, '.fila-centro .btn-expandir svg', '.fila-centro .codigo');
    expect(expandir.tamano).toEqual([16, 16]);
    expect(expandir.desfase).toBeLessThanOrEqual(1);
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

  test('4. tamaño de letra: el de shadcn/ui en tablas, botones y cajas (14 px) y el del navegador en el resto (16 px)', async ({ page }) => {
    const tamanos = () =>
      page.evaluate(() => {
        const t = (selector: string) => getComputedStyle(document.querySelector(selector)!).fontSize;
        return { pagina: t('body'), tabla: t('#tabla-resultados td'), boton: t('#btn-exportar'), caja: t('#buscador'), desplegable: t('#f-cliente') };
      });
    await page.setViewportSize({ width: 1366, height: 768 });
    await abrir(page, '/ordenes');
    expect(await tamanos()).toEqual({ pagina: '16px', tabla: '14px', boton: '14px', caja: '14px', desplegable: '14px' });
    await page.setViewportSize({ width: 375, height: 812 });
    await abrir(page, '/ordenes');
    expect(await tamanos()).toEqual({ pagina: '16px', tabla: '14px', boton: '14px', caja: '16px', desplegable: '14px' });
  });
});
