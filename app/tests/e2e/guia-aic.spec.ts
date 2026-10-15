// Pedidos del supervisor del 15/10/2026 (en Chromium, modo demo):
//   1. Una orden por línea: el Excel real trae varias órdenes en una misma celda ("OC 3519155 OC 3519252 …").
//   2. Guía de estilo oficial de AIC (letra Calibri, paleta de 9 colores, tablas con encabezado Primary Blue y texto
//      blanco en negrita, filas alternas Light Gray) aplicada SOBRE los componentes de shadcn/ui "naturales", sin
//      cambios (último pedido del día: "que use los estilos naturales de shadcn … solo agregando el estilo de marca").
//      La marca entra por las variables del tema (estilos.css); sombras, esquinas, transiciones, anillos de foco y
//      transparencias son los de shadcn/ui. Por eso, desde ese pedido, se permiten los colores de la paleta CON
//      transparencia (ej. hover:bg-primary/80) y las sombras neutras (negro con poca opacidad), pero ningún color
//      ajeno a la marca (ej. el azul del navegador o un color de Tailwind que no sale del tema).
//      Todo texto cumple el contraste WCAG 2.1 AA, en modo claro y en oscuro.
// (El margen lateral, el otro pedido del mismo día, se prueba en diseno.spec.ts.)
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import * as XLSX from 'xlsx/xlsx.mjs';
import { abrir, usarExcel, vigilarErrores } from './ayuda.ts';
import { al, FUNCIONES_COLOR, PALETA, prepararColores } from './colores.ts';
import { usarConfigPruebas } from './config-pruebas.ts';

test.beforeEach(async ({ context }) => {
  await usarConfigPruebas(context);
  await prepararColores(context);
});

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
// 2. Guía de estilo de AIC sobre los componentes de shadcn/ui sin cambios
// ---------------------------------------------------------------------------------------------------------------

/** Estilos calculados de un elemento, con los colores normalizados (ver colores.ts). */
const estilo = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const e = getComputedStyle(el);
      const c = window.normalizarColor;
      return {
        fondo: c(e.backgroundColor),
        texto: c(e.color),
        peso: e.fontWeight,
        alineacion: e.textAlign,
        letra: e.fontFamily,
        bordeArriba: c(e.borderTopColor),
        anchoBorde: e.borderTopWidth,
        bordeAbajo: c(e.borderBottomColor),
        anchoBordeAbajo: e.borderBottomWidth,
        esquina: e.borderTopLeftRadius,
        sombras: window.sombrasDe(e.boxShadow),
        padding: [e.paddingTop, e.paddingRight, e.paddingBottom, e.paddingLeft],
        alto: el.getBoundingClientRect().height,
      };
    });

/** Fondo de una fila de tabla (con el mouse donde esté). */
const fondoFila = async (page: Page, selector: string) => (await estilo(page, selector)).fondo;

test.describe('Guía de estilo oficial de AIC (sobre shadcn/ui sin cambios)', () => {
  test('tablas: encabezado de marca (Primary Blue, texto blanco en negrita y centrado) y filas alternas Light Gray', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    const th = await estilo(page, '#tabla-resultados thead th');
    expect(th).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white, peso: '700', alineacion: 'center' });
    // h-10 de la TableHead de shadcn/ui (40 px; la línea inferior de la fila, en el modelo de bordes colapsados de
    // la tabla, le suma medio píxel).
    expect(th.alto).toBeGreaterThanOrEqual(40);
    expect(th.alto).toBeLessThanOrEqual(41);
    // El botón que ordena hereda el texto blanco en negrita del encabezado.
    expect(await estilo(page, '#tabla-resultados thead th button')).toMatchObject({ texto: PALETA.white, peso: '700' });
    // Filas (TableRow de shadcn/ui): línea inferior de 1 px en Border Gray (--border); celdas con su padding (p-2).
    expect(await estilo(page, '#tabla-resultados tbody tr:nth-child(1)')).toMatchObject({ bordeAbajo: PALETA.borderGray, anchoBordeAbajo: '1px' });
    const td = await estilo(page, '#tabla-resultados tbody tr:nth-child(1) td');
    expect(td.texto).toBe(PALETA.black);
    expect(td.padding).toEqual(['8px', '8px', '8px', '8px']);
    // Filas alternas: impares sin fondo (se ve el White de la tarjeta), pares Light Gray (tabla de datos).
    expect(await fondoFila(page, '#tabla-resultados tbody tr:nth-child(1)')).toBe('transparente');
    expect(await fondoFila(page, '#tabla-resultados tbody tr:nth-child(2)')).toBe(PALETA.lightGray);
    expect((await estilo(page, '#contenedor-tabla')).fondo).toBe(PALETA.white);

    // El encabezado se queda fijo arriba al bajar dentro de la caja con scroll (una Card de shadcn/ui).
    const fijo = await page.locator('#contenedor-tabla').evaluate((caja) => {
      caja.scrollTop = 400;
      const encabezado = caja.querySelector('thead th')!.getBoundingClientRect();
      return { bajo: caja.scrollTop, distancia: Math.abs(encabezado.top - caja.getBoundingClientRect().top) };
    });
    expect(fijo.bajo).toBeGreaterThan(0);
    expect(fijo.distancia).toBeLessThanOrEqual(1);

    // Tabla sin botones de orden (detalle de un centro): el mismo encabezado de marca.
    await abrir(page, '/centros/CN-0005');
    expect(await estilo(page, '#tabla-detalle thead th')).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white, peso: '700', alineacion: 'center' });
  });

  test('letra Calibri; títulos y botón principal Primary Blue; avisos, tarjetas y botones con el estilo de shadcn/ui', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    expect((await estilo(page, 'body')).letra).toMatch(/^Calibri, Carlito/);
    expect((await estilo(page, '#tabla-resultados td')).letra).toMatch(/^Calibri/); // también los códigos y las tablas
    expect((await estilo(page, 'h1')).texto).toBe(PALETA.primaryBlue);
    // Aviso (Alert de shadcn/ui): fondo de tarjeta (White), borde Border Gray de 1 px y esquinas de 10 px (--radius).
    expect(await estilo(page, '#aviso-demo')).toMatchObject({
      fondo: PALETA.white,
      texto: PALETA.black,
      bordeArriba: PALETA.borderGray,
      anchoBorde: '1px',
      esquina: '10px',
    });
    // Tarjeta (Card de shadcn/ui, la caja de la tabla): esquinas de 14 px, contorno de 1 px y sombra, negros con poca opacidad.
    const caja = await estilo(page, '#contenedor-tabla');
    expect(caja.esquina).toBe('14px');
    expect(caja.sombras).toEqual(
      expect.arrayContaining([
        { color: al(PALETA.black, 0.1), medidas: '0px 0px 0px 1px' },
        { color: al(PALETA.black, 0.05), medidas: '0px 1px 2px 0px' },
      ]),
    );

    // "Por orden / Por centro" (Button de shadcn/ui en un ButtonGroup): la opción elegida va con el estilo principal
    // (Primary Blue, texto blanco) y la otra con el de "outline" (fondo White, borde Border Gray).
    const elegida = '[role="radio"][aria-checked="true"]';
    const otra = '[role="radio"][aria-checked="false"]';
    expect(await estilo(page, elegida)).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white });
    expect(await estilo(page, otra)).toMatchObject({ fondo: PALETA.white, texto: PALETA.black, bordeArriba: PALETA.borderGray });
    // Con el mouse encima, los fondos de shadcn/ui: la elegida al 80 % (hover:bg-primary/80), la otra Light Gray (bg-muted).
    await page.locator(elegida).hover();
    await expect.poll(async () => (await estilo(page, elegida)).fondo).toBe(al(PALETA.primaryBlue, 0.8));
    await page.locator(otra).hover();
    await expect.poll(async () => (await estilo(page, otra)).fondo).toBe(PALETA.lightGray);
    expect((await estilo(page, otra)).texto).toBe(PALETA.black);

    // Botón principal (esquinas de 8 px: rounded-md de shadcn/ui).
    await page.goto('/no-existe');
    expect(await estilo(page, '#enlace-ir-al-buscador')).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white, esquina: '8px' });
    // Error: Alert variant="destructive". La paleta no tiene rojo: el texto va en --destructive (Primary Blue), con su
    // ícono y role="alert".
    await page.route('**/datos/centros-ejemplo.xlsx', (r) => r.fulfill({ status: 404, body: '' }));
    await page.goto('/ordenes');
    await expect(page.locator('#aviso-error')).toBeVisible();
    await expect(page.locator('#aviso-error')).toHaveAttribute('role', 'alert');
    expect(await estilo(page, '#aviso-error')).toMatchObject({ fondo: PALETA.white, texto: PALETA.primaryBlue, bordeArriba: PALETA.borderGray });
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

  test('modo oscuro (no está en la guía): el tema oscuro de shadcn/ui, armado con la paleta', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await abrir(page, '/ordenes');
    expect(await estilo(page, 'body')).toMatchObject({ fondo: PALETA.black, texto: PALETA.white });
    // Encabezado de las tablas = --primary del tema oscuro: Light Blue con texto Primary Blue (9,5:1).
    expect(await estilo(page, '#tabla-resultados thead th')).toMatchObject({ fondo: PALETA.lightBlue, texto: PALETA.primaryBlue, peso: '700' });
    // Filas alternas = --muted del tema oscuro: Primary Blue (texto White, 11,1:1).
    expect(await fondoFila(page, '#tabla-resultados tbody tr:nth-child(2)')).toBe(PALETA.primaryBlue);
    // Bordes: los del tema oscuro de shadcn/ui (blanco al 10 %); cajas de texto: Gray (3,7:1 con el negro).
    expect((await estilo(page, '#aviso-demo')).bordeArriba).toBe(al(PALETA.white, 0.1));
    expect((await estilo(page, '#buscador')).bordeArriba).toBe(PALETA.gray);
    expect(await estilo(page, '[role="radio"][aria-checked="true"]')).toMatchObject({ fondo: PALETA.lightBlue, texto: PALETA.primaryBlue });
  });

  test('"Por centro": el centro abierto no se confunde con un encabezado (claro y oscuro)', async ({ page }) => {
    // Centro abierto: su fila y la de sus órdenes llevan el estado "seleccionada" de la TableRow de shadcn/ui
    // (data-state="selected" → data-[state=selected]:bg-muted, del componente; no es una clase de color propia).
    // Claro: Light Gray; oscuro: Primary Blue (el --muted de cada tema). Antes (has-aria-expanded:bg-muted/50) una fila
    // alterna se ACLARABA al abrirla y en claro el centro abierto casi no se distinguía de las filas blancas.
    for (const [tema, abierta] of [
      ['light', PALETA.lightGray],
      ['dark', PALETA.primaryBlue],
    ] as const) {
      await page.emulateMedia({ colorScheme: tema });
      await abrir(page, '/centros');
      const centro = page.locator('.fila-centro').nth(1); // fila par (con el fondo de fila alterna antes de abrirla)
      const alterna = await fondoFila(page, '.fila-centro:nth-child(4)'); // otra fila alterna, cerrada (mismo color)
      expect(alterna, tema).toBe(abierta);
      await centro.locator('.btn-expandir').click();
      await expect(page.locator('.fila-detalle')).toBeVisible();
      await page.locator('h1').hover(); // el mouse lejos de la tabla
      const encabezado = (await estilo(page, '#tabla-resultados > thead th')).fondo;
      await expect.poll(() => fondoFila(page, '.fila-centro.abierta'), { message: tema }).toBe(abierta); // no se aclara
      expect(await fondoFila(page, '.fila-detalle')).toBe(abierta); // la fila con sus órdenes sigue a la del centro
      await expect(page.locator('.fila-centro.abierta')).toHaveAttribute('data-state', 'selected');
      await expect(page.locator('.fila-detalle')).toHaveAttribute('data-state', 'selected');
      expect(abierta).not.toBe(encabezado);
      const encabezadoAnidado = (await estilo(page, '.fila-detalle .tabla-anidada thead th')).fondo;
      expect(encabezadoAnidado).toBe(encabezado);
      expect(encabezadoAnidado).not.toBe(abierta);
      // Con el mouse encima, el centro abierto no cambia.
      await centro.locator('td').nth(2).hover();
      await expect.poll(() => fondoFila(page, '.fila-centro.abierta'), { message: tema }).toBe(abierta);
      // Un centro que no es fila alterna (sin fondo cerrado) toma el mismo fondo al abrirlo.
      await page.locator('.fila-centro').first().locator('.btn-expandir').click();
      await page.locator('h1').hover();
      await expect.poll(() => fondoFila(page, '.fila-centro.abierta'), { message: `${tema}, primer centro` }).toBe(abierta);
    }
  });

  test('la fila con el mouse encima toma el fondo suave de shadcn/ui, nunca el color del encabezado (claro y oscuro)', async ({ page }) => {
    for (const [tema, conMouse] of [
      ['light', al(PALETA.lightGray, 0.5)],
      ['dark', al(PALETA.primaryBlue, 0.5)],
    ] as const) {
      await page.emulateMedia({ colorScheme: tema });
      await abrir(page, '/ordenes');
      const encabezado = (await estilo(page, '#tabla-resultados thead th')).fondo;
      for (const n of [1, 2]) {
        const selector = `#tabla-resultados > tbody > tr:nth-child(${n})`;
        await page.locator(`${selector} > td`).nth(2).hover();
        await expect.poll(() => fondoFila(page, selector), { message: `${tema}, fila ${n}` }).toBe(conMouse); // hover:bg-muted/50
        expect(conMouse).not.toBe(encabezado);
      }
    }
  });

  test('suavidad de shadcn/ui: la ayuda flotante y el aviso flotante aparecen con un fundido', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    // Ayuda flotante con el mouse: espera 300 ms antes de aparecer, como antes (TooltipProvider delayDuration={300} en
    // App.tsx; shadcn/ui trae 0 ms). Se mide dentro de la página, del primer movimiento del mouse sobre el botón a la
    // aparición de la ayuda: con la computadora ocupada solo puede tardar más, nunca menos.
    await page.evaluate(() => {
      const boton = document.querySelector('#btn-tema')!;
      const tiempos = { mouse: 0, ayuda: 0 };
      Object.assign(window, { tiemposAyuda: tiempos });
      boton.addEventListener('pointermove', () => (tiempos.mouse ||= performance.now()));
      new MutationObserver((_, observador) => {
        if (document.querySelector('[data-slot="tooltip-content"]')) {
          tiempos.ayuda = performance.now();
          observador.disconnect();
        }
      }).observe(document.body, { childList: true, subtree: true });
    });
    // Ayuda flotante con el mouse: la animación de entrada de shadcn/ui (fade-in-0 + zoom-in-95) empieza transparente.
    await page.locator('#btn-tema').hover();
    const ayuda = page.locator('[data-slot="tooltip-content"]');
    await expect(ayuda).toBeVisible();
    const espera = await page.evaluate(() => {
      const { mouse, ayuda } = (window as unknown as { tiemposAyuda: { mouse: number; ayuda: number } }).tiemposAyuda;
      return ayuda - mouse;
    });
    expect(espera).toBeGreaterThanOrEqual(290);
    const entrada = await ayuda.evaluate((el) => {
      const e = getComputedStyle(el);
      return {
        animacion: e.animationName,
        duracion: parseFloat(e.animationDuration),
        desde: e.getPropertyValue('--tw-enter-opacity').trim(),
        fondo: window.normalizarColor(e.backgroundColor),
        texto: window.normalizarColor(e.color),
      };
    });
    // animate-in fade-in-0 (tw-animate-css): la animación "enter" empieza con opacidad 0 y dura más de 0 s.
    expect(entrada.animacion).toContain('enter');
    expect(entrada.duracion).toBeGreaterThan(0);
    expect(entrada.desde).toBe('0');
    await expect(ayuda).toHaveCSS('opacity', '1');
    // Termina con los colores del tema: bg-foreground / text-background (Black / White en claro).
    expect(entrada).toMatchObject({ fondo: PALETA.black, texto: PALETA.white });

    // Aviso flotante ("Código … copiado"): se desliza y aparece con fundido (transición de opacity y translate).
    await page.getByRole('button', { name: /^Copiar código/ }).first().click();
    const aviso = page.locator('#aviso-flotante');
    await expect(aviso).toContainText('copiado');
    expect((await aviso.evaluate((el) => getComputedStyle(el).transitionProperty)).split(/,\s*/)).toEqual(['opacity', 'translate']);
    await expect(aviso).toHaveCSS('opacity', '1');
  });

  test('texto seleccionado con colores de la paleta (no el azul del navegador)', async ({ page }) => {
    // ::selection de estilos.css es una regla global: también pinta la selección dentro del Input de shadcn/ui (el
    // buscador), que no trae colores de selección propios (README 8.2).
    for (const [tema, fondo, texto] of [
      ['light', PALETA.primaryBlue, PALETA.white],
      ['dark', PALETA.lightBlue, PALETA.primaryBlue],
    ] as const) {
      await page.emulateMedia({ colorScheme: tema });
      await abrir(page, '/ordenes');
      const buscador = page.getByLabel('Buscar', { exact: true });
      await buscador.fill('3519');
      await buscador.selectText();
      const seleccion = await buscador.evaluate((el) => {
        const e = getComputedStyle(el, '::selection');
        return { fondo: e.backgroundColor, texto: e.color };
      });
      expect(seleccion, tema).toEqual({ fondo, texto });
      // También en el texto de la página (ej. una celda de la tabla).
      // expect.poll: con varias pruebas en paralelo la tabla puede estar redibujándose tras la búsqueda.
      await expect
        .poll(() => page.locator('#tabla-resultados td').first().evaluate((el) => getComputedStyle(el, '::selection').backgroundColor), { message: tema })
        .toBe(fondo);
    }
  });

  test('quien pide menos movimiento en su sistema: sin transiciones ni fundidos (también en los de shadcn/ui); los demás, los de shadcn/ui', async ({ page }) => {
    // Regla global de accesibilidad de estilos.css (WCAG 2.3.3; README 8.2): solo actúa con prefers-reduced-motion.
    const duraciones = async () => {
      await page.locator('#btn-tema').hover(); // abre la ayuda flotante (Tooltip de shadcn/ui; con el mouse lleva fundido)
      await expect(page.locator('[data-slot="tooltip-content"]')).toBeVisible();
      return page.evaluate(() => {
        const t = (selector: string, propiedad: 'transitionDuration' | 'animationDuration') =>
          parseFloat(getComputedStyle(document.querySelector(selector)!)[propiedad]);
        return {
          boton: t('#btn-exportar', 'transitionDuration'), // Button
          caja: t('#buscador', 'transitionDuration'), // Input
          fila: t('#tabla-resultados tbody tr', 'transitionDuration'), // TableRow
          ayuda: t('[data-slot="tooltip-content"]', 'animationDuration'), // Tooltip (fundido)
        };
      });
    };
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
    await abrir(page, '/ordenes');
    expect(await duraciones()).toEqual({ boton: 0.15, caja: 0.15, fila: 0.15, ayuda: 0.15 }); // los de shadcn/ui
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await abrir(page, '/ordenes');
    for (const [nombre, segundos] of Object.entries(await duraciones())) expect(segundos, nombre).toBeLessThan(0.001);
  });

  test('☀️/🌙: la ayuda flotante no repite el nombre como descripción; "copiar" no lleva ayuda flotante', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    const tema = page.locator('#btn-tema');
    await tema.focus();
    await expect(page.getByRole('tooltip')).toHaveText('Cambiar a modo oscuro');
    await expect(tema).toHaveAccessibleName('Cambiar a modo oscuro');
    await expect(tema).not.toHaveAttribute('aria-describedby', /.*/); // nombre y ayuda iguales: no se lee dos veces
    await expect(tema).toHaveAccessibleDescription('');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);

    // "Copiar código": sin ayuda flotante (una por fila hacía lento cambiar de página) ni "title" (se leería dos veces).
    const copiar = page.locator('#tabla-resultados .btn-copiar').first();
    await copiar.hover();
    await page.waitForTimeout(600); // más que la espera y la animación de una ayuda flotante
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await expect(copiar).toHaveAccessibleName(/^Copiar código /);
    await expect(copiar).toHaveAccessibleDescription('');
    await expect(copiar).not.toHaveAttribute('title', /.*/);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Solo colores de la marca y contraste AA, en todas las pantallas (claro y oscuro)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Recorre todo lo que se ve en la página y devuelve:
 *  - fueraDePaleta: colores (texto, fondo, bordes, contornos, sombras, subrayados, íconos) ajenos a la marca, en
 *    cualquier notación (rgb, oklab, oklch, lab…). Criterio pedido por Gustavo (15/10/2026, shadcn/ui "natural"):
 *    se aceptan los 9 colores de la paleta y sus TRANSPARENCIAS (las que agregan los componentes de shadcn/ui:
 *    hover:bg-primary/80, ring-ring/50, bg-input/30, border blanco al 10 % en oscuro…), que incluyen las sombras
 *    neutras (negro con poca opacidad: shadow-xs, ring-foreground/10). Se informa cualquier otro: el azul del
 *    navegador, un color de Tailwind que no sale del tema, el rojo de shadcn/ui…
 *  - bajoContraste: textos con contraste menor que el de WCAG 2.1 AA (4,5:1; 3:1 si el texto es grande), con el color
 *    REAL del fondo y del texto: las transparencias (y la opacidad de los contenedores) se mezclan con lo de abajo.
 * No cuenta lo que no se ve (oculto, transparente o solo para lectores de pantalla), los controles desactivados
 * (WCAG no les pide contraste) ni el logo de Microsoft (sus colores son la marca de Microsoft).
 * Las opciones de los desplegables (<option>) no ocupan lugar en la página (las dibuja el sistema al abrir la lista),
 * así que se revisan aparte: el NativeSelectOption de shadcn/ui las pinta con los colores del SISTEMA (bg-[Canvas]
 * text-[CanvasText]). En claro son White y Black; en oscuro, el Canvas de Chromium es casi negro (rgb(18, 18, 18)),
 * que no está en la paleta. Es la única excepción y es explícita: se aceptan Canvas y CanvasText tal como los resuelve
 * el navegador (README 8.1); cualquier otro color ajeno a la marca en una opción se informa.
 */
function revisarColores(page: Page) {
  return page.evaluate(
    async ({ paleta, funciones }) => {
      // Primero terminan las transiciones y animaciones (ej. el aviso o la ayuda flotante que aparecen): se revisa cómo
      // queda la pantalla. Las que no terminan nunca (la ruedita de "Cargando…") no se esperan.
      await Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => {})),
      );
      const permitidos = new Set<string>(paleta);
      const color = window.normalizarColor;
      const fueraDePaleta = new Set<string>();
      const bajoContraste: string[] = [];
      /** "rgb(r, g, b) / alfa" → canales y alfa. */
      const partes = (c: string) => {
        const [rgb, alfa] = c.split(' / ');
        return { canales: (rgb!.match(/\d+/g) ?? []).map(Number), rgb: rgb!, alfa: alfa === undefined ? 1 : Number(alfa) };
      };
      /** Un color (con alfa) dibujado sobre otro (opaco). */
      const sobre = (arriba: string, abajo: number[], opacidad = 1) => {
        const { canales, alfa } = partes(arriba);
        const a = alfa * opacidad;
        return canales.map((v, i) => a * v + (1 - a) * abajo[i]!);
      };
      const luz = (c: number[]) => {
        const [r, g, b] = c.map((v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
      };
      const contraste = (a: number[], b: number[]) => {
        const [x, y] = [luz(a), luz(b)].sort((m, n) => n - m);
        return (x! + 0.05) / (y! + 0.05);
      };
      const texto = (c: number[]) => `rgb(${c.map(Math.round).join(', ')})`;
      const nombre = (el: Element) =>
        `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ')[0]}` : ''}`;
      const revisar = (el: Element, propiedad: string, valor: string) => {
        for (const c of valor.match(new RegExp(funciones, 'g')) ?? []) {
          const n = color(c);
          if (n !== 'transparente' && !permitidos.has(partes(n).rgb)) fueraDePaleta.add(`${nombre(el)} ${propiedad}: ${c} → ${n}`);
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
      /** Fondo real detrás de un elemento: su fondo y los de sus contenedores, mezclados hasta llegar a uno opaco. */
      const fondoDe = (el: Element) => {
        const capas: string[] = [];
        for (let a: Element | null = el; a; a = a.parentElement) {
          const f = color(getComputedStyle(a).backgroundColor);
          if (f === 'transparente') continue;
          capas.push(f);
          if (partes(f).alfa >= 1) break;
        }
        let resultado = [255, 255, 255];
        for (const capa of capas.reverse()) resultado = sobre(capa, resultado);
        return resultado;
      };
      /** Opacidad acumulada del elemento y sus contenedores. */
      const opacidadDe = (el: Element) => {
        let o = 1;
        for (let a: Element | null = el; a; a = a.parentElement) o *= Number(getComputedStyle(a).opacity);
        return o;
      };

      // Opciones de los desplegables que se ven (ver arriba): paleta o colores del sistema (Canvas / CanvasText).
      const sistema = document.createElement('div');
      sistema.style.cssText = 'background-color: Canvas; color: CanvasText';
      document.body.append(sistema);
      const delSistema = new Set([color(getComputedStyle(sistema).backgroundColor), color(getComputedStyle(sistema).color)]);
      sistema.remove();
      for (const opcion of document.querySelectorAll('select option')) {
        if (!seVe(opcion.closest('select')!)) continue;
        const e = getComputedStyle(opcion);
        for (const [propiedad, valor] of [
          ['color', e.color],
          ['background-color', e.backgroundColor],
        ] as const) {
          const n = color(valor);
          if (n !== 'transparente' && !permitidos.has(partes(n).rgb) && !delSistema.has(n)) {
            fueraDePaleta.add(`${nombre(opcion.closest('select')!)} option ${propiedad}: ${valor} → ${n}`);
          }
        }
      }

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
        const conTexto = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
        if (!conTexto || el.closest(':disabled, [aria-disabled="true"]')) continue;
        const tamano = parseFloat(e.fontSize);
        const grande = tamano >= 24 || (tamano >= 18.66 && Number(e.fontWeight) >= 700);
        const fondo = fondoDe(el);
        const letra = sobre(color(e.color), fondo, opacidadDe(el));
        const c = contraste(letra, fondo);
        if (c < (grande ? 3 : 4.5)) {
          bajoContraste.push(`${nombre(el)} "${el.textContent?.trim().slice(0, 30)}": ${c.toFixed(2)} (${texto(letra)} sobre ${texto(fondo)})`);
        }
      }
      return { fueraDePaleta: [...fueraDePaleta], bajoContraste };
    },
    { paleta: Object.values(PALETA), funciones: FUNCIONES_COLOR },
  );
}

test('el revisor de colores informa los colores ajenos a la marca y el contraste bajo (y acepta las transparencias de la paleta)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await abrir(page, '/ordenes');
  await page.evaluate(() => {
    const sondas = document.createElement('div');
    sondas.id = 'sondas';
    sondas.innerHTML = [
      // Ajenos a la marca: deben informarse.
      '<a id="sonda-navegador" href="#sondas" style="all: revert">enlace con el azul del navegador</a>',
      '<div id="sonda-tailwind" style="height: 4px; border: 2px solid oklch(0.623 0.214 259.815)"></div>', // blue-500 de Tailwind
      '<div id="sonda-rojo" style="height: 4px; background-color: oklch(0.577 0.245 27.325)"></div>', // --destructive de shadcn/ui
      '<div id="sonda-anillo" style="height: 4px; box-shadow: 0 0 0 3px rgb(255 0 0 / 0.5)"></div>',
      // Una opción de desplegable con un color ajeno (las opciones no ocupan lugar en la página: se revisan aparte).
      '<select id="sonda-opcion" aria-label="sonda"><option style="background-color: oklch(0.577 0.245 27.325)">rojo</option></select>',
      // De la marca (se aceptan): una transparencia de la paleta y una sombra neutra.
      '<p id="sonda-transparencia" style="background-color: color-mix(in oklab, #1e3a6e 80%, transparent); color: #fff">Primary Blue al 80 %</p>',
      '<p id="sonda-sombra" style="box-shadow: 0 1px 2px rgb(0 0 0 / 0.05)">sombra neutra</p>',
      // De la paleta, pero con contraste bajo (Border Gray sobre White: 1,6:1).
      '<p id="sonda-contraste" style="color: #cccccc; background-color: #ffffff">texto casi invisible</p>',
    ].join('');
    document.querySelector('#principal')!.prepend(sondas);
  });
  const { fueraDePaleta, bajoContraste } = await revisarColores(page);
  const sondas = (lista: string[]) => [...new Set(lista.map((x) => /#(sonda-[\w-]+)/.exec(x)?.[1] ?? `(otro) ${x}`))].sort();
  expect(sondas(fueraDePaleta)).toEqual(['sonda-anillo', 'sonda-navegador', 'sonda-opcion', 'sonda-rojo', 'sonda-tailwind']);
  expect(sondas(bajoContraste)).toEqual(['sonda-contraste']);
});

for (const tema of ['light', 'dark'] as const) {
  test.describe(`Solo colores de la marca y contraste AA (modo ${tema === 'light' ? 'claro' : 'oscuro'})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: tema });
    });

    test('lista "Por orden" con búsqueda resaltada, foco con el teclado y ayuda flotante', async ({ page }) => {
      await abrir(page, '/ordenes?q=cn0005');
      expect(await revisarColores(page)).toEqual({ fueraDePaleta: [], bajoContraste: [] });
      // Con el foco del teclado en "copiar" (anillo).
      await page.locator('#tabla-resultados .enlace-codigo').first().focus();
      await page.keyboard.press('Tab');
      await expect(page.locator('#tabla-resultados .btn-copiar').first()).toBeFocused();
      expect(await revisarColores(page)).toEqual({ fueraDePaleta: [], bajoContraste: [] });
      // Con el foco del teclado en ☀️/🌙 (anillo + ayuda flotante).
      await page.locator('#btn-tema').focus();
      await expect(page.getByRole('tooltip')).toHaveText(tema === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
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
