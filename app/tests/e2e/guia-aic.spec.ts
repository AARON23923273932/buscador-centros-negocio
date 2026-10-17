import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import * as XLSX from 'xlsx/xlsx.mjs';
import { abrir, usarExcel, vigilarErrores } from './ayuda.ts';
import { al, COLORES_MARCA, FUNCIONES_COLOR, PALETA, prepararColores, TONOS_SUAVES } from './colores.ts';
import { usarConfigPruebas } from './config-pruebas.ts';

test.beforeEach(async ({ context }) => {
  await usarConfigPruebas(context);
  await prepararColores(context);
});

const SIETE = 'OC 3519155 OC 3519252 OC N° 3519348 OC N° 3519553 OC N° 3519521 OC N° 8702 OC N° 3519670';
const LINEAS_SIETE = ['OC 3519155', 'OC 3519252', 'OC N° 3519348', 'OC N° 3519553', 'OC N° 3519521', 'OC N° 8702', 'OC N° 3519670'];
const EXCEL_REAL = [
  ['CLIENTE INTERNO Y EXTERNO', 'CODIGO', 'DESCRIPCION', 'OC/OS', 'ESTADO'],
  ['Cliente Real A', 'A2338PY01', 'Centro con varias órdenes', SIETE, 'Abierta'],
  ['Cliente Real A', 'A2338PY01', 'Centro con varias órdenes', 'OC 533 OC N° 3519522', 'Cerrada'],
  ['Cliente Real B', 'B100', 'Centro de una orden', 'OC-0000098263-2025', 'Abierta'],
  ['Cliente Real B', 'C200', 'Otro centro', 'OS-2026-0001', 'Abierta'],
];
const celdaOrden = (page: Page, fila: number) => page.locator(`#tabla-resultados > tbody > tr:nth-child(${fila}) > td:nth-child(4)`);

const lineasDe = (celda: ReturnType<Page['locator']>) =>
  celda.locator('.orden-linea').evaluateAll((lineas) => lineas.map((l) => ({ texto: l.textContent, arriba: l.getBoundingClientRect().top })));

test.describe('Varias órdenes en una misma celda: una por línea', () => {
  test('tabla "Por orden": cada OC/OS en su propia línea; una sola orden queda igual', async ({ page }) => {
    const errores = vigilarErrores(page);
    await usarExcel(page, EXCEL_REAL);
    await abrir(page, '/ordenes');
    await expect(page.locator('#aviso-columnas')).toBeHidden();

    const lineas = await lineasDe(celdaOrden(page, 1));
    expect(lineas.map((l) => l.texto)).toEqual(LINEAS_SIETE);
    for (let i = 1; i < lineas.length; i++) expect(lineas[i]!.arriba).toBeGreaterThan(lineas[i - 1]!.arriba);
    expect(await celdaOrden(page, 1).innerText()).toBe(LINEAS_SIETE.join('\n'));
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
    expect(matriz).toHaveLength(5);
    const iOrden = matriz[0]!.indexOf('OC/OS');
    expect(matriz[1]![iOrden]).toBe(LINEAS_SIETE.join('\n'));
    expect(matriz[2]![iOrden]).toBe('OC 533\nOC N° 3519522');
    expect(matriz[3]![iOrden]).toBe('OC-0000098263-2025');

    const zip = XLSX.CFB.read(bytes, { type: 'buffer' });
    const leer = (ruta: string) => String(zip.FileIndex[zip.FullPaths.findIndex((p: string) => p.endsWith(`/${ruta}`))]?.content ?? '');
    const estilos = leer('xl/styles.xml');
    const xfs = [...estilos.slice(estilos.indexOf('<cellXfs'), estilos.indexOf('</cellXfs>')).matchAll(/<xf [^>]*?(?:\/>|>.*?<\/xf>)/g)].map((m) => m[0]);
    const conAjuste = xfs.findIndex((xf) => xf.includes('wrapText="1"'));
    expect(conAjuste).toBeGreaterThan(0);
    const letra = XLSX.utils.encode_col(iOrden);
    const hoja = leer('xl/worksheets/sheet1.xml');
    expect(hoja).toMatch(new RegExp(`<c r="${letra}2" s="${conAjuste}"`));
    expect(hoja).toMatch(new RegExp(`<c r="${letra}3" s="${conAjuste}"`));
    expect(hoja).not.toMatch(new RegExp(`<c r="${letra}4" s="${conAjuste}"`));
  });
});

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

const fondoFila = async (page: Page, selector: string) => (await estilo(page, selector)).fondo;

test.describe('Guía de estilo oficial de AIC (sobre shadcn/ui sin cambios)', () => {
  test('tablas: encabezado de marca (Primary Blue, texto blanco en negrita y centrado) y filas alternas Light Gray', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    const th = await estilo(page, '#tabla-resultados thead th');
    expect(th).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white, peso: '700', alineacion: 'center' });
    expect(th.alto).toBeGreaterThanOrEqual(40);
    expect(th.alto).toBeLessThanOrEqual(41);
    expect(await estilo(page, '#tabla-resultados thead th button')).toMatchObject({ texto: PALETA.white, peso: '700' });
    expect(await estilo(page, '#tabla-resultados tbody tr:nth-child(1)')).toMatchObject({ bordeAbajo: TONOS_SUAVES.bordeSuave, anchoBordeAbajo: '1px' });
    const td = await estilo(page, '#tabla-resultados tbody tr:nth-child(1) td');
    expect(td.texto).toBe(TONOS_SUAVES.tinta);
    expect(td.padding).toEqual(['8px', '8px', '8px', '8px']);
    expect(await fondoFila(page, '#tabla-resultados tbody tr:nth-child(1)')).toBe('transparente');
    expect(await fondoFila(page, '#tabla-resultados tbody tr:nth-child(2)')).toBe(TONOS_SUAVES.filaClara);
    expect((await estilo(page, '#contenedor-tabla')).fondo).toBe(PALETA.white);

    const fijo = await page.locator('#contenedor-tabla').evaluate((caja) => {
      caja.scrollTop = 400;
      const encabezado = caja.querySelector('thead th')!.getBoundingClientRect();
      return { bajo: caja.scrollTop, distancia: Math.abs(encabezado.top - caja.getBoundingClientRect().top) };
    });
    expect(fijo.bajo).toBeGreaterThan(0);
    expect(fijo.distancia).toBeLessThanOrEqual(1);

    await abrir(page, '/centros/CN-0005');
    expect(await estilo(page, '#tabla-detalle thead th')).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white, peso: '700', alineacion: 'center' });
  });

  test('letra Calibri; títulos y botón principal Primary Blue; avisos, tarjetas y botones con el estilo de shadcn/ui', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    expect((await estilo(page, 'body')).letra).toMatch(/^Calibri, Carlito/);
    expect((await estilo(page, '#tabla-resultados td')).letra).toMatch(/^Calibri/);
    expect((await estilo(page, 'h1')).texto).toBe(PALETA.primaryBlue);
    expect(await estilo(page, '#aviso-demo')).toMatchObject({
      fondo: PALETA.white,
      texto: TONOS_SUAVES.tinta,
      bordeArriba: TONOS_SUAVES.bordeSuave,
      anchoBorde: '1px',
      esquina: '12px',
    });
    const caja = await estilo(page, '#contenedor-tabla');
    expect(caja.esquina).toBe('16.8px');
    expect(caja.sombras).toEqual(
      expect.arrayContaining([
        { color: al(TONOS_SUAVES.tinta, 0.1), medidas: '0px 0px 0px 1px' },
        { color: al(PALETA.black, 0.05), medidas: '0px 1px 2px 0px' },
      ]),
    );

    const elegida = '[role="radio"][aria-checked="true"]';
    const otra = '[role="radio"][aria-checked="false"]';
    expect(await estilo(page, elegida)).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white });
    expect(await estilo(page, otra)).toMatchObject({ fondo: PALETA.lightGray, texto: TONOS_SUAVES.tinta, bordeArriba: TONOS_SUAVES.bordeSuave });
    await page.locator(elegida).hover();
    await expect.poll(async () => (await estilo(page, elegida)).fondo).toBe(al(PALETA.primaryBlue, 0.8));
    await page.locator(otra).hover();
    await expect.poll(async () => (await estilo(page, otra)).fondo).toBe(TONOS_SUAVES.filaClara);
    expect((await estilo(page, otra)).texto).toBe(TONOS_SUAVES.tinta);

    await page.goto('/no-existe');
    expect(await estilo(page, '#enlace-ir-al-buscador')).toMatchObject({ fondo: PALETA.primaryBlue, texto: PALETA.white, esquina: '9.6px' });
    await page.route('**/datos/centros-ejemplo.xlsx', (r) => r.fulfill({ status: 404, body: '' }));
    await page.goto('/ordenes');
    await expect(page.locator('#aviso-error')).toBeVisible();
    await expect(page.locator('#aviso-error')).toHaveAttribute('role', 'alert');
    expect(await estilo(page, '#aviso-error')).toMatchObject({ fondo: PALETA.white, texto: PALETA.primaryBlue, bordeArriba: TONOS_SUAVES.bordeSuave });
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
    expect(await estilo(page, 'body')).toMatchObject({ fondo: TONOS_SUAVES.pizarra, texto: TONOS_SUAVES.textoOscuro });
    expect(await estilo(page, '#tabla-resultados thead th')).toMatchObject({ fondo: TONOS_SUAVES.azulSuave, texto: TONOS_SUAVES.pizarra, peso: '700' });
    expect(await fondoFila(page, '#tabla-resultados tbody tr:nth-child(2)')).toBe(TONOS_SUAVES.pizarraFila);
    expect((await estilo(page, '#aviso-demo')).bordeArriba).toBe(al(TONOS_SUAVES.textoOscuro, 0.1));
    expect((await estilo(page, '#buscador')).bordeArriba).toBe(TONOS_SUAVES.bordeCajaOscuro);
    expect(await estilo(page, '[role="radio"][aria-checked="true"]')).toMatchObject({ fondo: TONOS_SUAVES.azulSuave, texto: TONOS_SUAVES.pizarra });
  });

  test('"Por centro": el centro abierto no se confunde con un encabezado (claro y oscuro)', async ({ page }) => {
    for (const [tema, abierta] of [
      ['light', TONOS_SUAVES.filaClara],
      ['dark', TONOS_SUAVES.pizarraFila],
    ] as const) {
      await page.emulateMedia({ colorScheme: tema });
      await abrir(page, '/centros');
      const centro = page.locator('.fila-centro').nth(1);
      const alterna = await fondoFila(page, '.fila-centro:nth-child(4)');
      expect(alterna, tema).toBe(abierta);
      await centro.locator('.btn-expandir').click();
      await expect(page.locator('.fila-detalle')).toBeVisible();
      await page.locator('h1').hover();
      const encabezado = (await estilo(page, '#tabla-resultados > thead th')).fondo;
      await expect.poll(() => fondoFila(page, '.fila-centro.abierta'), { message: tema }).toBe(abierta);
      expect(await fondoFila(page, '.fila-detalle')).toBe(abierta);
      await expect(page.locator('.fila-centro.abierta')).toHaveAttribute('data-state', 'selected');
      await expect(page.locator('.fila-detalle')).toHaveAttribute('data-state', 'selected');
      expect(abierta).not.toBe(encabezado);
      const encabezadoAnidado = (await estilo(page, '.fila-detalle .tabla-anidada thead th')).fondo;
      expect(encabezadoAnidado).toBe(encabezado);
      expect(encabezadoAnidado).not.toBe(abierta);
      await centro.locator('td').nth(2).hover();
      await expect.poll(() => fondoFila(page, '.fila-centro.abierta'), { message: tema }).toBe(abierta);
      await page.locator('.fila-centro').first().locator('.btn-expandir').click();
      await page.locator('h1').hover();
      await expect.poll(() => fondoFila(page, '.fila-centro.abierta'), { message: `${tema}, primer centro` }).toBe(abierta);
    }
  });

  test('la fila con el mouse encima toma el fondo suave de shadcn/ui, nunca el color del encabezado (claro y oscuro)', async ({ page }) => {
    for (const [tema, conMouse] of [
      ['light', al(TONOS_SUAVES.filaClara, 0.5)],
      ['dark', al(TONOS_SUAVES.pizarraFila, 0.5)],
    ] as const) {
      await page.emulateMedia({ colorScheme: tema });
      await abrir(page, '/ordenes');
      const encabezado = (await estilo(page, '#tabla-resultados thead th')).fondo;
      for (const n of [1, 2]) {
        const selector = `#tabla-resultados > tbody > tr:nth-child(${n})`;
        await page.locator(`${selector} > td`).nth(2).hover();
        await expect.poll(() => fondoFila(page, selector), { message: `${tema}, fila ${n}` }).toBe(conMouse);
        expect(conMouse).not.toBe(encabezado);
      }
    }
  });

  test('suavidad de shadcn/ui: el aviso flotante aparece con un fundido', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    await page.getByRole('button', { name: /^Copiar código/ }).first().click();
    const aviso = page.locator('#aviso-flotante');
    await expect(aviso).toContainText('copiado');
    expect((await aviso.evaluate((el) => getComputedStyle(el).transitionProperty)).split(/,\s*/)).toEqual(['opacity', 'translate']);
    await expect(aviso).toHaveCSS('opacity', '1');
  });

  test('texto seleccionado con colores de la paleta (no el azul del navegador)', async ({ page }) => {
    for (const [tema, fondo, texto] of [
      ['light', PALETA.primaryBlue, PALETA.white],
      ['dark', TONOS_SUAVES.azulSuave, TONOS_SUAVES.pizarra],
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
      await expect
        .poll(() => page.locator('#tabla-resultados td').first().evaluate((el) => getComputedStyle(el, '::selection').backgroundColor), { message: tema })
        .toBe(fondo);
    }
  });

  test('quien pide menos movimiento en su sistema: sin transiciones ni fundidos (también en los de shadcn/ui); los demás, los de shadcn/ui', async ({ page }) => {
    const duraciones = async () => {
      return page.evaluate(() => {
        const t = (selector: string, propiedad: 'transitionDuration' | 'animationDuration') =>
          parseFloat(getComputedStyle(document.querySelector(selector)!)[propiedad]);
        return {
          boton: t('#btn-exportar', 'transitionDuration'),
          caja: t('#buscador', 'transitionDuration'),
          fila: t('#tabla-resultados tbody tr', 'transitionDuration'),
        };
      });
    };
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'no-preference' });
    await abrir(page, '/ordenes');
    expect(await duraciones()).toEqual({ boton: 0.15, caja: 0.15, fila: 0.15 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await abrir(page, '/ordenes');
    for (const [nombre, segundos] of Object.entries(await duraciones())) expect(segundos, nombre).toBeLessThan(0.001);
  });

  test('botón de tema: su nombre dice el tema actual y el siguiente; "copiar" no lleva ayuda flotante', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await abrir(page, '/ordenes');
    const tema = page.locator('#btn-tema');
    await expect(tema).toHaveAccessibleName('Tema del sistema. Cambiar a tema claro');
    await tema.focus();
    await page.keyboard.press('Enter');
    await expect(tema).toHaveAccessibleName('Tema claro. Cambiar a tema oscuro');
    await expect(tema).toBeFocused();

    const copiar = page.locator('#tabla-resultados .btn-copiar').first();
    await copiar.hover();
    await page.waitForTimeout(600);
    await expect(page.locator('[role="tooltip"], [data-slot="tooltip-content"]')).toHaveCount(0);
    await expect(copiar).toHaveAccessibleName(/^Copiar código /);
    await expect(copiar).toHaveAccessibleDescription('');
    await expect(copiar).not.toHaveAttribute('title', /.*/);
  });
});

function revisarColores(page: Page) {
  return page.evaluate(
    async ({ paleta, funciones }) => {
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
      const partes = (c: string) => {
        const [rgb, alfa] = c.split(' / ');
        return { canales: (rgb!.match(/\d+/g) ?? []).map(Number), rgb: rgb!, alfa: alfa === undefined ? 1 : Number(alfa) };
      };
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
      const opacidadDe = (el: Element) => {
        let o = 1;
        for (let a: Element | null = el; a; a = a.parentElement) o *= Number(getComputedStyle(a).opacity);
        return o;
      };

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
    { paleta: COLORES_MARCA, funciones: FUNCIONES_COLOR },
  );
}

test('el revisor de colores informa los colores ajenos a la marca y el contraste bajo (y acepta las transparencias de la paleta)', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await abrir(page, '/ordenes');
  await page.evaluate(() => {
    const sondas = document.createElement('div');
    sondas.id = 'sondas';
    sondas.innerHTML = [
      '<a id="sonda-navegador" href="#sondas" style="all: revert">enlace con el azul del navegador</a>',
      '<div id="sonda-tailwind" style="height: 4px; border: 2px solid oklch(0.623 0.214 259.815)"></div>',
      '<div id="sonda-rojo" style="height: 4px; background-color: oklch(0.577 0.245 27.325)"></div>',
      '<div id="sonda-anillo" style="height: 4px; box-shadow: 0 0 0 3px rgb(255 0 0 / 0.5)"></div>',
      '<select id="sonda-opcion" aria-label="sonda"><option style="background-color: oklch(0.577 0.245 27.325)">rojo</option></select>',
      '<p id="sonda-transparencia" style="background-color: color-mix(in oklab, #1e3a6e 80%, transparent); color: #fff">Primary Blue al 80 %</p>',
      '<p id="sonda-sombra" style="box-shadow: 0 1px 2px rgb(0 0 0 / 0.05)">sombra neutra</p>',
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

    test('lista "Por orden" con búsqueda resaltada y foco con el teclado', async ({ page }) => {
      await abrir(page, '/ordenes?q=cn0005');
      expect(await revisarColores(page)).toEqual({ fueraDePaleta: [], bajoContraste: [] });
      await page.locator('#tabla-resultados .enlace-codigo').first().focus();
      await page.keyboard.press('Tab');
      await expect(page.locator('#tabla-resultados .btn-copiar').first()).toBeFocused();
      expect(await revisarColores(page)).toEqual({ fueraDePaleta: [], bajoContraste: [] });
      await page.locator('#btn-tema').focus();
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
