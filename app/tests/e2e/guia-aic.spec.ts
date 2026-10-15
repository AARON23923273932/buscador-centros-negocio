// Pedidos del supervisor del 15/10/2026 (en Chromium, modo demo):
//   1. Una orden por línea: el Excel real trae varias órdenes en una misma celda ("OC 3519155 OC 3519252 …").
//   2. Guía de estilo oficial de AIC: solo los 9 colores de la paleta, letra Calibri, tablas con encabezado
//      Primary Blue (texto blanco en negrita), bordes Border Gray, filas alternas Light Gray y el padding de la guía.
//      Todo texto cumple el contraste WCAG 2.1 AA, en modo claro y en oscuro.
// (El margen lateral, el otro pedido del mismo día, se prueba en diseno.spec.ts.)
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import * as XLSX from 'xlsx/xlsx.mjs';
import { abrir, usarExcel, vigilarErrores } from './ayuda.ts';
import { usarConfigPruebas } from './config-pruebas.ts';

test.beforeEach(async ({ context }) => {
  await usarConfigPruebas(context);
});

/** Los 9 colores de la guía, como los devuelve getComputedStyle. */
const PALETA = {
  primaryBlue: 'rgb(30, 58, 110)',
  darkBlue: 'rgb(44, 82, 130)',
  mediumBlue: 'rgb(59, 107, 170)',
  lightBlue: 'rgb(232, 238, 245)',
  lightGray: 'rgb(245, 245, 245)',
  black: 'rgb(0, 0, 0)',
  white: 'rgb(255, 255, 255)',
  gray: 'rgb(102, 102, 102)',
  borderGray: 'rgb(204, 204, 204)',
} as const;

// ---------------------------------------------------------------------------------------------------------------
// 1. Varias órdenes en una celda
// ---------------------------------------------------------------------------------------------------------------

/** Celdas como las del Excel real (columnas "CLIENTE INTERNO Y EXTERNO", "CODIGO", "DESCRIPCION", "OC/OS", "ESTADO"). */
const SIETE = 'OC 3519155 OC 3519252 OC N° 3519348 OC N° 3519553 OC N° 3519521 OC N° 8702 OC N° 3519670';
const LINEAS_SIETE = ['OC 3519155', 'OC 3519252', 'OC N° 3519348', 'OC N° 3519553', 'OC N° 3519521', 'OC N° 8702', 'OC N° 3519670'];
const EXCEL_REAL = [
  ['CLIENTE INTERNO Y EXTERNO', 'CODIGO', 'DESCRIPCION', 'OC/OS', 'ESTADO'],
  ['Cliente Real A', 'A2338PY01', 'Centro con varias órdenes', SIETE, 'Abierta'],
  ['Cliente Real A', 'A2338PY01', 'Centro con varias órdenes', 'OC 533 OC N° 3519522', 'Cerrada'],
  ['Cliente Real B', 'B100', 'Centro de una orden', 'OC-0000098263-2025', 'Abierta'],
  ['Cliente Real B', 'C200', 'Otro centro', 'OS-2026-0001', 'Abierta'],
];
/** Columna OC/OS (4.ª) de la tabla. */
const celdaOrden = (page: Page, fila: number) => page.locator(`#tabla-resultados > tbody > tr:nth-child(${fila}) > td:nth-child(4)`);

/** Cada línea de la celda: texto y posición vertical (cada orden debe ir más abajo que la anterior). */
const lineasDe = (celda: ReturnType<Page['locator']>) =>
  celda.locator('.orden-linea').evaluateAll((lineas) => lineas.map((l) => ({ texto: l.textContent, arriba: l.getBoundingClientRect().top })));

test.describe('Varias órdenes en una misma celda: una por línea', () => {
  test('tabla "Por orden": cada OC/OS en su propia línea; una sola orden queda igual', async ({ page }) => {
    const errores = vigilarErrores(page);
    await usarExcel(page, EXCEL_REAL);
    await abrir(page, '/ordenes');
    await expect(page.locator('#aviso-columnas')).toBeHidden(); // las columnas del Excel real se reconocen

    const lineas = await lineasDe(celdaOrden(page, 1));
    expect(lineas.map((l) => l.texto)).toEqual(LINEAS_SIETE);
    for (let i = 1; i < lineas.length; i++) expect(lineas[i]!.arriba).toBeGreaterThan(lineas[i - 1]!.arriba);
    expect(await celdaOrden(page, 1).innerText()).toBe(LINEAS_SIETE.join('\n'));
    // "OC 533 OC N° 3519522" → dos líneas; una sola orden (con guiones y año) no se corta.
    expect((await lineasDe(celdaOrden(page, 2))).map((l) => l.texto)).toEqual(['OC 533', 'OC N° 3519522']);
    await expect(celdaOrden(page, 3)).toHaveText('OC-0000098263-2025');
    await expect(celdaOrden(page, 3).locator('.orden-linea')).toHaveCount(0);
    expect(errores).toEqual([]);
  });

  test('el buscador y el filtro "Orden" buscan en el texto completo y resaltan dentro de la línea', async ({ page }) => {
    await usarExcel(page, EXCEL_REAL);
    await abrir(page, '/ordenes');
    await page.getByLabel('Buscar', { exact: true }).fill('3519348');
    await expect(page.locator('#contador')).toHaveText('Mostrando 1–1 de 1 resultado (de 4 en total)');
    const resaltado = celdaOrden(page, 1).locator('.orden-linea').nth(2).locator('mark');
    await expect(resaltado).toHaveText('3519348');
    await expect(celdaOrden(page, 1).locator('mark')).toHaveCount(1);

    // Lo buscado puede cruzar de una orden a la siguiente (se busca en el texto de la celda).
    await page.getByLabel('Buscar', { exact: true }).fill('3519155 OC 3519252');
    await expect(page.locator('#contador')).toHaveText('Mostrando 1–1 de 1 resultado (de 4 en total)');
    await page.getByRole('button', { name: 'Borrar búsqueda' }).click();

    await page.getByLabel('Orden de compra / servicio').fill('OC N° 8702');
    await expect(page.locator('#contador')).toHaveText('Mostrando 1–1 de 1 resultado (de 4 en total)');
    await expect(celdaOrden(page, 1).locator('.orden-linea').nth(5).locator('mark')).toHaveText('OC N° 8702');
  });

  test('"Por centro" y el detalle: "N° de órdenes" cuenta cada orden y las órdenes van una por línea', async ({ page }) => {
    await usarExcel(page, EXCEL_REAL);
    await abrir(page, '/centros');
    // A2338PY01: 7 órdenes en una celda + 2 en otra = 9 (antes contaba 2, una por celda).
    const fila = page.locator('.fila-centro[data-grupo="c:a2338py01"]');
    await expect(fila.locator('.insignia')).toHaveText('9');
    await fila.locator('.btn-expandir').click();
    const anidada = page.locator('.fila-detalle .tabla-anidada tbody tr').first().locator('td').nth(3);
    expect((await lineasDe(anidada)).map((l) => l.texto)).toEqual(LINEAS_SIETE);

    await fila.locator('.enlace-codigo').click();
    await expect(page.getByRole('heading', { level: 2, name: 'Centro de negocio A2338PY01' })).toBeVisible();
    await expect(page.locator('#numero-ordenes')).toHaveText('9');
    const detalle = page.locator('#tabla-detalle tbody tr').first().locator('td').nth(3);
    expect((await lineasDe(detalle)).map((l) => l.texto)).toEqual(LINEAS_SIETE);
  });

  test('exportar: cada orden en una línea dentro de la misma celda, con "Ajustar texto"', async ({ page }) => {
    await usarExcel(page, EXCEL_REAL);
    await abrir(page, '/ordenes');
    const [descarga] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar a Excel' }).click()]);
    expect(descarga.suggestedFilename()).toMatch(/^centros-de-negocio_\d{4}-\d{2}-\d{2}_\d{4}\.xlsx$/);
    const bytes = readFileSync(await descarga.path());

    const libro = XLSX.read(bytes, { type: 'buffer' });
    const matriz = XLSX.utils.sheet_to_json<string[]>(libro.Sheets['Órdenes']!, { header: 1 });
    expect(matriz).toHaveLength(5); // las mismas filas que la tabla (no una fila por orden)
    const iOrden = matriz[0]!.indexOf('OC/OS');
    expect(matriz[1]![iOrden]).toBe(LINEAS_SIETE.join('\n'));
    expect(matriz[2]![iOrden]).toBe('OC 533\nOC N° 3519522');
    expect(matriz[3]![iOrden]).toBe('OC-0000098263-2025');

    // "Ajustar texto" (wrapText) en el estilo de esas celdas, para que Excel muestre las líneas.
    const zip = XLSX.CFB.read(bytes, { type: 'buffer' }); // un .xlsx es un .zip con archivos .xml
    const leer = (ruta: string) => String(zip.FileIndex[zip.FullPaths.findIndex((p: string) => p.endsWith(`/${ruta}`))]?.content ?? '');
    const estilos = leer('xl/styles.xml');
    const xfs = [...estilos.slice(estilos.indexOf('<cellXfs'), estilos.indexOf('</cellXfs>')).matchAll(/<xf [^>]*?(?:\/>|>.*?<\/xf>)/g)].map((m) => m[0]);
    const conAjuste = xfs.findIndex((xf) => xf.includes('wrapText="1"'));
    expect(conAjuste).toBeGreaterThan(0);
    const letra = XLSX.utils.encode_col(iOrden);
    const hoja = leer('xl/worksheets/sheet1.xml');
    expect(hoja).toMatch(new RegExp(`<c r="${letra}2" s="${conAjuste}"`));
    expect(hoja).toMatch(new RegExp(`<c r="${letra}3" s="${conAjuste}"`));
    expect(hoja).not.toMatch(new RegExp(`<c r="${letra}4" s="${conAjuste}"`)); // una sola orden: sin cambios
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 2. Guía de estilo de AIC
// ---------------------------------------------------------------------------------------------------------------

/** Estilos calculados de un elemento (los que pide la guía). */
const estilo = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const e = getComputedStyle(el);
    return {
      fondo: e.backgroundColor,
      texto: e.color,
      peso: e.fontWeight,
      alineacion: e.textAlign,
      letra: e.fontFamily,
      bordeArriba: e.borderTopColor,
      bordeAbajo: e.borderBottomColor,
      bordeDerecha: e.borderRightColor,
      bordeIzquierda: e.borderLeftColor,
      anchoBordeIzquierda: e.borderLeftWidth,
      padding: [e.paddingTop, e.paddingRight, e.paddingBottom, e.paddingLeft],
    };
  });

test.describe('Guía de estilo oficial de AIC', () => {
  test('tablas: encabezado Primary Blue con texto blanco en negrita y centrado; bordes; filas alternas; padding', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    const th = await estilo(page, '#tabla-resultados thead th');
    expect(th).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white, peso: '700', alineacion: 'center' });
    expect(th.bordeAbajo).toBe(PALETA.darkBlue); // bordes del encabezado: Dark Blue
    expect(th.bordeDerecha).toBe(PALETA.darkBlue);
    // Padding del encabezado (6 pt arriba/abajo, 4 pt a los lados ≈ 8 px / 5 px): lo lleva el botón que ordena.
    expect((await estilo(page, '#tabla-resultados thead th button')).padding).toEqual(['8px', '5px', '8px', '5px']);
    // Celdas: bordes Border Gray y padding de la guía (4 pt arriba/abajo, 6 pt a los lados ≈ 5 px / 8 px).
    const td = await estilo(page, '#tabla-resultados tbody tr:nth-child(1) td');
    expect(td).toMatchObject({ bordeAbajo: PALETA.borderGray, bordeDerecha: PALETA.borderGray, texto: PALETA.black });
    expect(td.padding).toEqual(['5px', '8px', '5px', '8px']);
    // Filas alternas: impares blancas, pares Light Gray (tabla de datos).
    expect((await estilo(page, '#tabla-resultados tbody tr:nth-child(1)')).fondo).toBe(PALETA.white);
    expect((await estilo(page, '#tabla-resultados tbody tr:nth-child(2)')).fondo).toBe(PALETA.lightGray);

    // Tabla sin botones de orden (detalle de un centro): el padding de la guía lo lleva el mismo <th>.
    await abrir(page, '/centros/CN-0005');
    const thDetalle = await estilo(page, '#tabla-detalle thead th');
    expect(thDetalle).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white, peso: '700', alineacion: 'center' });
    expect(thDetalle.padding).toEqual(['8px', '5px', '8px', '5px']);
  });

  test('letra Calibri; botón principal Primary Blue; avisos con la "caja de nota" de la guía', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    expect((await estilo(page, 'body')).letra).toMatch(/^Calibri, Carlito/);
    expect((await estilo(page, '#tabla-resultados td')).letra).toMatch(/^Calibri/); // también los códigos y las tablas
    expect((await estilo(page, 'h1')).texto).toBe(PALETA.primaryBlue);
    // Caja de nota: fondo Light Blue, borde izquierdo grueso Primary Blue, demás bordes Border Gray.
    const nota = await estilo(page, '#aviso-demo');
    expect(nota).toMatchObject({ fondo: PALETA.lightBlue, bordeIzquierda: PALETA.primaryBlue, anchoBordeIzquierda: '4px', bordeArriba: PALETA.borderGray });
    // Opción elegida de "Por orden / Por centro": Primary Blue con texto blanco.
    expect(await estilo(page, '[role="radio"][aria-checked="true"]')).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white });
    // …también con el mouse encima (no se confunde con la otra opción, que con el mouse encima va en Light Blue).
    await page.locator('[role="radio"][aria-checked="true"]').hover();
    expect(await estilo(page, '[role="radio"][aria-checked="true"]')).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white });
    await page.locator('[role="radio"][aria-checked="false"]').hover();
    expect(await estilo(page, '[role="radio"][aria-checked="false"]')).toMatchObject({ fondo: PALETA.lightBlue, texto: PALETA.primaryBlue });
    expect(await estilo(page, '[role="radio"][aria-checked="true"]')).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white });

    // Botón principal.
    await page.goto('/no-existe');
    expect(await estilo(page, '#enlace-ir-al-buscador')).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white });
    // El error usa la misma caja (sin rojo): se distingue por el ícono y el borde más grueso.
    await page.route('**/datos/centros-ejemplo.xlsx', (r) => r.fulfill({ status: 404, body: '' }));
    await page.goto('/ordenes');
    await expect(page.locator('#aviso-error')).toBeVisible();
    expect(await estilo(page, '#aviso-error')).toMatchObject({ fondo: PALETA.lightBlue, bordeIzquierda: PALETA.primaryBlue, anchoBordeIzquierda: '8px' });
    await expect(page.locator('#aviso-error > svg')).toBeVisible();
  });

  test('botón "Iniciar sesión con Microsoft": Primary Blue con texto blanco', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.route(/^https:\/\/(login\.microsoftonline\.com|graph\.microsoft\.com)\//, (r) => r.abort());
    await usarConfigPruebas(page, {
      modo: 'microsoft',
      microsoft: { clientId: '11111111-2222-3333-4444-555555555555', tenantId: 'aaaaaaaa-0000-0000-0000-000000000001' },
    });
    await page.goto('/ordenes');
    expect(await estilo(page, '#btn-login')).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white });
  });

  test('modo oscuro (no está en la guía): encabezado Dark Blue con texto blanco, fondo negro', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await abrir(page, '/ordenes');
    expect((await estilo(page, 'body')).fondo).toBe(PALETA.black);
    expect(await estilo(page, '#tabla-resultados thead th')).toMatchObject({ fondo: PALETA.darkBlue, texto: PALETA.white, peso: '700' });
    expect((await estilo(page, '#tabla-resultados tbody tr:nth-child(2)')).fondo).toBe(PALETA.primaryBlue);
  });

  /**
   * Fondo de una fila y la raya izquierda de su primera celda (sombra interior de 4 px; Tailwind agrega otras
   * sombras vacías, transparentes, que no se ven), con el mouse donde esté.
   */
  const fila = (page: Page, selector: string) =>
    page.locator(selector).first().evaluate((tr) => ({
      fondo: getComputedStyle(tr).backgroundColor,
      raya: /rgba?\([^)]*\) 4px 0px 0px 0px inset/.exec(getComputedStyle(tr.querySelector(':scope > td')!).boxShadow)?.[0] ?? 'ninguna',
    }));
  const raya = (color: string) => `${color} 4px 0px 0px 0px inset`;

  test('"Por centro": el centro abierto no se confunde con un encabezado (claro y oscuro)', async ({ page }) => {
    for (const tema of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: tema });
      await abrir(page, '/centros');
      const centro = page.locator('.fila-centro').nth(1); // fila par (en oscuro, Primary Blue antes de abrirla)
      await centro.locator('.btn-expandir').click();
      await expect(page.locator('.fila-detalle')).toBeVisible();
      await page.locator('h1').hover(); // el mouse lejos de la tabla
      const encabezado = (await estilo(page, '#tabla-resultados > thead th')).fondo;
      const abierta = await fila(page, '.fila-centro.abierta');
      const detalle = await fila(page, '.fila-detalle');
      const encabezadoAnidado = (await estilo(page, '.fila-detalle .tabla-anidada thead th')).fondo;
      if (tema === 'light') {
        // Como la caja de nota de la guía: fondo Light Blue y raya izquierda Primary Blue.
        expect(abierta).toEqual({ fondo: PALETA.lightBlue, raya: raya(PALETA.primaryBlue) });
        expect(encabezado).toBe(PALETA.primaryBlue);
      } else {
        // Antes: fila abierta, encabezado y encabezado de sus órdenes, los tres Dark Blue.
        expect(abierta).toEqual({ fondo: PALETA.black, raya: raya(PALETA.lightBlue) });
        expect(encabezado).toBe(PALETA.darkBlue);
      }
      expect(detalle).toEqual(abierta); // la fila con sus órdenes sigue a la del centro
      expect(abierta.fondo).not.toBe(encabezado);
      expect(encabezadoAnidado).toBe(encabezado);
      expect(encabezadoAnidado).not.toBe(detalle.fondo);
      // Con el mouse encima, el centro abierto no cambia (ni pierde su raya).
      await centro.locator('td').nth(2).hover();
      expect(await fila(page, '.fila-centro.abierta')).toEqual(abierta);
    }
  });

  test('modo oscuro: la fila con el mouse encima no se pinta del color del encabezado', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await abrir(page, '/ordenes');
    for (const n of [1, 2]) {
      const selector = `#tabla-resultados > tbody > tr:nth-child(${n})`;
      await page.locator(`${selector} > td`).nth(2).hover();
      expect(await fila(page, selector), `fila ${n}`).toEqual({ fondo: PALETA.black, raya: raya(PALETA.lightBlue) });
    }
    // En claro la fila con el mouse encima es Light Blue, sin raya (la "raya" es del mismo color que la fila).
    await page.emulateMedia({ colorScheme: 'light' });
    const selector = '#tabla-resultados > tbody > tr:nth-child(2)';
    await page.locator(`${selector} > td`).nth(2).hover();
    expect(await fila(page, selector)).toEqual({ fondo: PALETA.lightBlue, raya: raya(PALETA.lightBlue) });
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Solo colores de la paleta y contraste AA, en todas las pantallas (claro y oscuro)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Recorre todo lo que se ve en la página y devuelve:
 *  - fueraDePaleta: colores (texto, fondo, bordes, contornos, sombras, subrayados, íconos) que no son de la paleta;
 *  - bajoContraste: textos con contraste menor que el de WCAG 2.1 AA (4,5:1; 3:1 si el texto es grande).
 * No cuenta lo que no se ve (oculto, transparente o solo para lectores de pantalla), los controles desactivados
 * (WCAG no les pide contraste) ni el logo de Microsoft (sus colores son la marca de Microsoft).
 */
function revisarColores(page: Page) {
  return page.evaluate(async (paleta) => {
    // Primero terminan las transiciones (ej. el aviso flotante que aparece): se revisa cómo queda la pantalla.
    await Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished.catch(() => {})));
    const permitidos = new Set<string>(Object.values(paleta));
    const fueraDePaleta = new Set<string>();
    const bajoContraste: string[] = [];
    const rgb = (c: string) => c.match(/[\d.]+/g)!.map(Number);
    const luz = (c: string) => {
      const [r, g, b] = rgb(c).map((v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const contraste = (a: string, b: string) => {
      const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m);
      return (x! + 0.05) / (y! + 0.05);
    };
    const transparente = (c: string) => c === 'transparent' || /^rgba\(.*,\s*0\)$/.test(c);
    const nombre = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ')[0]}` : ''}`;
    const revisar = (el: Element, propiedad: string, valor: string) => {
      for (const color of valor.match(/rgba?\([^)]*\)/g) ?? []) {
        if (!transparente(color) && !permitidos.has(color)) fueraDePaleta.add(`${nombre(el)} ${propiedad}: ${color}`);
      }
    };
    const seVe = (el: Element) => {
      if (el.getClientRects().length === 0) return false;
      for (let a: Element | null = el; a; a = a.parentElement) {
        const e = getComputedStyle(a);
        if (e.visibility === 'hidden' || Number(e.opacity) === 0 || e.clipPath === 'inset(50%)') return false;
      }
      return true;
    };
    const fondoDe = (el: Element) => {
      for (let a: Element | null = el; a; a = a.parentElement) {
        const f = getComputedStyle(a).backgroundColor;
        if (!transparente(f)) return f;
      }
      return getComputedStyle(document.body).backgroundColor;
    };

    for (const el of document.body.querySelectorAll('*')) {
      if (!seVe(el) || el.closest('#btn-login svg')) continue;
      const e = getComputedStyle(el);
      revisar(el, 'color', e.color);
      revisar(el, 'background-color', e.backgroundColor);
      for (const lado of ['Top', 'Right', 'Bottom', 'Left'] as const) {
        if (e[`border${lado}Style`] !== 'none' && parseFloat(e[`border${lado}Width`]) > 0) revisar(el, `border-${lado}`, e[`border${lado}Color`]);
      }
      if (e.outlineStyle !== 'none' && parseFloat(e.outlineWidth) > 0) revisar(el, 'outline', e.outlineColor);
      if (e.boxShadow !== 'none') revisar(el, 'box-shadow', e.boxShadow);
      if (e.textDecorationLine !== 'none') revisar(el, 'text-decoration', e.textDecorationColor);
      if (el instanceof SVGElement) {
        if (e.fill !== 'none') revisar(el, 'fill', e.fill);
        if (e.stroke !== 'none') revisar(el, 'stroke', e.stroke);
      }
      // Contraste: elementos con texto propio (no el de sus hijos).
      const texto = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
      if (!texto || el.closest(':disabled, [aria-disabled="true"]')) continue;
      const tamano = parseFloat(e.fontSize);
      const grande = tamano >= 24 || (tamano >= 18.66 && Number(e.fontWeight) >= 700);
      const c = contraste(e.color, fondoDe(el));
      if (c < (grande ? 3 : 4.5)) bajoContraste.push(`${nombre(el)} "${el.textContent?.trim().slice(0, 30)}": ${c.toFixed(2)} (${e.color} sobre ${fondoDe(el)})`);
    }
    return { fueraDePaleta: [...fueraDePaleta], bajoContraste };
  }, PALETA);
}

for (const tema of ['light', 'dark'] as const) {
  test.describe(`Solo colores de la paleta y contraste AA (modo ${tema === 'light' ? 'claro' : 'oscuro'})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema });
    });

    test('lista "Por orden" con búsqueda resaltada, foco con el teclado y ayuda flotante', async ({ page }) => {
      await abrir(page, '/ordenes?q=cn0005');
      expect(await revisarColores(page)).toEqual({ fueraDePaleta: [], bajoContraste: [] });
      // Con el foco del teclado en "copiar" (anillo + ayuda flotante "Copiar código").
      await page.locator('#tabla-resultados .enlace-codigo').first().focus();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('tooltip')).toHaveText('Copiar código');
      expect(await revisarColores(page)).toEqual({ fueraDePaleta: [], bajoContraste: [] });
    });

    test('"Por centro" con un centro abierto y el detalle de un centro', async ({ page }) => {
      await abrir(page, '/centros');
      await page.locator('.btn-expandir').first().click();
      await page.locator('.fila-centro').nth(2).hover();
      expect(await revisarColores(page)).toEqual({ fueraDePaleta: [], bajoContraste: [] });
      await abrir(page, '/centros/CN-0005');
      await page.getByRole('button', { name: 'Columnas detectadas en el Excel' }).click();
      expect(await revisarColores(page)).toEqual({ fueraDePaleta: [], bajoContraste: [] });
    });

    test('pantallas de mensaje, "Página no encontrada", error del Excel e inicio de sesión', async ({ page }) => {
      await page.goto('/no-existe');
      await expect(page.locator('#pantalla-no-encontrada')).toBeVisible();
      expect(await revisarColores(page)).toEqual({ fueraDePaleta: [], bajoContraste: [] });

      await page.route('**/datos/centros-ejemplo.xlsx', (r) => r.fulfill({ status: 404, body: '' }));
      await page.goto('/ordenes');
      await expect(page.locator('#aviso-error')).toBeVisible();
      expect(await revisarColores(page)).toEqual({ fueraDePaleta: [], bajoContraste: [] });

      await usarConfigPruebas(page, { filasPorPagina: 30 });
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Falta configurar la aplicación' })).toBeVisible();
      expect(await revisarColores(page)).toEqual({ fueraDePaleta: [], bajoContraste: [] });

      await page.route(/^https:\/\/(login\.microsoftonline\.com|graph\.microsoft\.com)\//, (r) => r.abort());
      await usarConfigPruebas(page, {
        modo: 'microsoft',
        microsoft: { clientId: '11111111-2222-3333-4444-555555555555', tenantId: 'aaaaaaaa-0000-0000-0000-000000000001' },
      });
      await page.goto('/ordenes');
      await expect(page.locator('#btn-login')).toBeVisible();
      expect(await revisarColores(page)).toEqual({ fueraDePaleta: [], bajoContraste: [] });
    });

    test('celular: filtros abiertos y aviso flotante', async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.setViewportSize({ width: 375, height: 812 });
      await abrir(page, '/ordenes');
      await page.getByRole('button', { name: /^Filtros/ }).click();
      await page.getByLabel('Estado', { exact: true }).selectOption('Abierta');
      await page.getByRole('button', { name: /^Copiar código/ }).first().click();
      await expect(page.locator('#aviso-flotante')).toContainText('copiado');
      await expect(page.locator('#aviso-flotante')).toHaveCSS('opacity', '1');
      expect(await revisarColores(page)).toEqual({ fueraDePaleta: [], bajoContraste: [] });
    });
  });
}
