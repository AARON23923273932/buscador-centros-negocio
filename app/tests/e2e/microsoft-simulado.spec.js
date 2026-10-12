// Flujo completo de "Iniciar sesión con Microsoft" + lectura del Excel por Microsoft Graph,
// SIMULADO dentro de la prueba: ninguna petición sale a internet. Sirve para comprobar que
// la app usa bien MSAL v5 (redirect.html, handleRedirectPromise, tokens) y Graph.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { CONFIG_PRUEBAS } from './config-pruebas.js';

// Configuración fija de pruebas (no la de app/public/config.json, que puede tener valores de producción).
const CONFIG = CONFIG_PRUEBAS;
const EXCEL = readFileSync(resolve(import.meta.dirname, '../../public/datos/centros-ejemplo.xlsx'));

const CLIENT_ID = '11111111-2222-3333-4444-555555555555';
const TENANT = 'aaaaaaaa-0000-4000-8000-000000000001';
const OID = 'cccccccc-0000-4000-8000-000000000003';
const URL_EXCEL = 'https://aic-demo.sharepoint.com/:x:/s/Demo/EjemploFicticio?e=abc';
const DESCARGA = 'https://aic-demo.sharepoint.com/_layouts/15/download.aspx?temporal=1';
// La dirección del navegador de Excel Online que dio el usuario (Doc.aspx en el sitio raíz).
const URL_DOC =
  'https://jaicoscorp.sharepoint.com/:x:/r/_layouts/15/Doc.aspx?sourcedoc=%7BE20FAA1A-1E42-416B-BA9F-A6FCF00E07C8%7D' +
  '&file=centros-negocio-aic.xlsx&action=default&mobileredirect=true&wdwpf=doclib-c';
const GUID_EXCEL = 'e20faa1a-1e42-416b-ba9f-a6fcf00e07c8';

const b64url = (texto) => Buffer.from(texto).toString('base64url');
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-expose-headers': '*',
};

function crearIdToken({ correo, nonce }) {
  const ahora = Math.floor(Date.now() / 1000);
  const datos = {
    aud: CLIENT_ID,
    iss: `https://login.microsoftonline.com/${TENANT}/v2.0`,
    iat: ahora,
    nbf: ahora,
    exp: ahora + 3600,
    name: 'Persona de Prueba',
    oid: OID,
    preferred_username: correo,
    sub: 'sujeto-de-prueba',
    tid: TENANT,
    ver: '2.0',
    nonce,
  };
  return `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'prueba' }))}.${b64url(JSON.stringify(datos))}.firma`;
}

/**
 * Prepara un "Microsoft falso": login.microsoftonline.com y graph.microsoft.com responden desde la prueba.
 * Devuelve un objeto con lo que la app pidió (para revisarlo).
 */
async function simularMicrosoft(
  page,
  {
    correo,
    cambiosConfig = {},
    enlacesVencidos = 0,
    urlExcel = URL_EXCEL,
    graph = null,
    // Permisos que Microsoft dice haber concedido al iniciar sesión, y respuesta propia al renovar el token
    // (ej. "falta que un administrador apruebe Files.Read.All").
    permisosConcedidos = 'User.Read Files.Read.All openid profile',
    respuestaRenovacion = null,
  },
) {
  const registro = {
    autorizacion: null,
    autorizaciones: [],
    graph: [],
    descargas: 0,
    cierreSesion: null,
    eTag: '"{EJEMPLO},1"',
    vencidos: enlacesVencidos,
  };
  const clientInfo = b64url(JSON.stringify({ uid: OID, utid: TENANT }));

  const config = structuredClone(CONFIG);
  config.modo = 'microsoft';
  config.microsoft = { ...config.microsoft, clientId: CLIENT_ID, tenantId: TENANT };
  config.datos = { ...config.datos, fuente: 'graph', urlCompartida: urlExcel };
  Object.assign(config, cambiosConfig);
  await page.route('**/config.json', (r) => r.fulfill({ json: config }));

  await page.route(/^https:\/\/login\.microsoftonline\.com\//, async (ruta) => {
    const req = ruta.request();
    const url = new URL(req.url());
    if (req.method() === 'OPTIONS') return ruta.fulfill({ status: 204, headers: CORS });
    if (url.pathname.endsWith('/oauth2/v2.0/authorize')) {
      registro.autorizacion = url;
      registro.autorizaciones.push(url);
      return ruta.fulfill({ contentType: 'text/html', body: '<h1>Microsoft (simulado)</h1>' });
    }
    if (url.pathname.endsWith('/oauth2/v2.0/token')) {
      const pedido = new URLSearchParams(req.postData() || '');
      if (pedido.get('grant_type') === 'refresh_token' && respuestaRenovacion) {
        return ruta.fulfill({ status: respuestaRenovacion.status, headers: CORS, json: respuestaRenovacion.json });
      }
      const nonce = registro.autorizacion.searchParams.get('nonce');
      return ruta.fulfill({
        headers: CORS,
        json: {
          token_type: 'Bearer',
          scope: permisosConcedidos,
          expires_in: 3600,
          ext_expires_in: 3600,
          access_token: 'token-de-acceso-de-prueba',
          refresh_token: 'token-de-refresco-de-prueba',
          id_token: crearIdToken({ correo, nonce }),
          client_info: clientInfo,
        },
      });
    }
    if (url.pathname.endsWith('/oauth2/v2.0/logout')) {
      registro.cierreSesion = url;
      return ruta.fulfill({ contentType: 'text/html', body: '<h1>Sesión cerrada (simulado)</h1>' });
    }
    return ruta.fulfill({ status: 404, headers: CORS, body: '' });
  });

  await page.route(/^https:\/\/graph\.microsoft\.com\//, async (ruta) => {
    const req = ruta.request();
    if (req.method() === 'OPTIONS') return ruta.fulfill({ status: 204, headers: CORS });
    registro.graph.push({ url: req.url(), auth: req.headers()['authorization'] });
    // Respuestas propias de la prueba (ej. "no se pudo abrir como enlace", bibliotecas, búsqueda…).
    const propia = graph?.(new URL(req.url()));
    if (propia) return ruta.fulfill({ status: propia.status ?? 200, headers: CORS, json: propia.json });
    return ruta.fulfill({
      headers: CORS,
      json: {
        id: '01EJEMPLO',
        name: 'Centros de negocio.xlsx',
        eTag: registro.eTag,
        lastModifiedDateTime: '2026-10-08T21:45:00Z',
        webUrl: URL_EXCEL,
        file: {},
        '@microsoft.graph.downloadUrl': DESCARGA,
      },
    });
  });

  await page.route(/^https:\/\/(aic-demo|jaicoscorp)\.sharepoint\.com\//, async (ruta) => {
    if (ruta.request().method() === 'OPTIONS') return ruta.fulfill({ status: 204, headers: CORS });
    // Enlace temporal vencido: SharePoint responde 403.
    if (registro.vencidos > 0) {
      registro.vencidos--;
      return ruta.fulfill({ status: 403, headers: CORS, body: '' });
    }
    registro.descargas++;
    return ruta.fulfill({ headers: CORS, body: EXCEL, contentType: 'application/octet-stream' });
  });

  return { registro, clientInfo };
}

/** Pulsa "Iniciar sesión" y simula que Microsoft devuelve al usuario a redirect.html. */
async function iniciarSesionSimulada(page, sim) {
  await page.goto('/?q=cableado');
  await page.getByRole('button', { name: 'Iniciar sesión con Microsoft' }).click();
  await expect.poll(() => sim.registro.autorizacion !== null).toBe(true);
  const aut = sim.registro.autorizacion;
  const respuesta = new URLSearchParams({
    code: 'codigo-de-prueba',
    state: aut.searchParams.get('state'),
    client_info: sim.clientInfo,
    session_state: 'sesion-de-prueba',
  });
  await page.goto(`${aut.searchParams.get('redirect_uri')}#${respuesta}`);
}

test.describe('Inicio de sesión con Microsoft (simulado)', () => {
  test('cuenta @aic.pe: entra, lee el Excel por Graph y conserva la búsqueda del enlace', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    const sim = await simularMicrosoft(page, { correo: 'persona.prueba@aic.pe' });
    await iniciarSesionSimulada(page, sim);

    // Lo que la app le pidió a Microsoft:
    const aut = sim.registro.autorizacion;
    expect(aut.pathname).toBe(`/${TENANT}/oauth2/v2.0/authorize`);
    expect(aut.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(aut.searchParams.get('redirect_uri')).toMatch(/\/redirect\.html$/);
    // Al iniciar sesión solo se pide el permiso básico; Files.Read.All se pide al leer el Excel.
    expect(aut.searchParams.get('scope')).toContain('User.Read');
    expect(aut.searchParams.get('scope')).not.toContain('Files.Read.All');
    expect(aut.searchParams.get('prompt')).toBe('select_account');
    expect(aut.searchParams.get('code_challenge_method')).toBe('S256');

    // Ya dentro de la app:
    await expect(page.locator('#contador')).toContainText('Mostrando', { timeout: 15_000 });
    await expect(page.locator('#correo-usuario')).toHaveText('persona.prueba@aic.pe');
    await expect(page.locator('#nombre-usuario')).toHaveText('Persona de Prueba');
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    await expect(page.locator('#aviso-demo')).toBeHidden();
    await expect(page.locator('#texto-actualizado')).toContainText('Excel modificado el 08/10/2026');
    // La búsqueda del enlace original se conservó tras volver de Microsoft.
    await expect(page.getByLabel('Buscar', { exact: true })).toHaveValue('cableado');
    await expect(page).toHaveURL(/\?q=cableado$/);

    // Graph se llamó con el token y el enlace codificado; la descarga fue por el enlace temporal.
    expect(sim.registro.graph[0].url).toMatch(/\/v1\.0\/shares\/u!.+\/driveItem$/);
    expect(sim.registro.graph[0].auth).toBe('Bearer token-de-acceso-de-prueba');
    expect(sim.registro.descargas).toBe(1);

    // Cerrar sesión lleva al cierre de sesión de Microsoft.
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect.poll(() => sim.registro.cierreSesion !== null).toBe(true);
    expect(sim.registro.cierreSesion.searchParams.get('post_logout_redirect_uri')).toMatch(/127\.0\.0\.1:\d+\/$/);
    expect(errores).toEqual([]);
  });

  test('falta que un administrador apruebe Files.Read.All: la persona igual entra y la app explica qué hacer', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    const sim = await simularMicrosoft(page, {
      correo: 'persona.prueba@aic.pe',
      // Al entrar, Microsoft solo concede User.Read; al pedir Files.Read.All responde "falta el consentimiento".
      permisosConcedidos: 'User.Read openid profile',
      respuestaRenovacion: {
        status: 400,
        json: {
          error: 'invalid_grant',
          error_description: 'AADSTS65001: The user or administrator has not consented to use the application.',
          error_codes: [65001],
          suberror: 'consent_required',
        },
      },
    });
    await iniciarSesionSimulada(page, sim);

    // La app manda a Microsoft a pedir Files.Read.All (una sola vez)…
    await expect.poll(() => sim.registro.autorizaciones.length, { timeout: 15_000 }).toBe(2);
    const pedido = sim.registro.autorizaciones[1];
    expect(pedido.searchParams.get('scope')).toContain('Files.Read.All');
    // …y Microsoft la devuelve con "una directiva impide aprobar permisos" (la persona no es administradora).
    const error = new URLSearchParams({
      error: 'access_denied',
      error_description:
        'AADSTS90093: An administrator of JAICOS CORP S.A.C. has set a policy that prevents you from granting the permissions.',
      state: pedido.searchParams.get('state'),
    });
    await page.goto(`${pedido.searchParams.get('redirect_uri')}#${error}`);

    // Sigue con la sesión iniciada y ve qué falta, sin volver a rebotar a Microsoft.
    await expect(page.locator('#nombre-usuario')).toHaveText('Persona de Prueba', { timeout: 15_000 });
    const aviso = page.locator('#aviso-error');
    await expect(aviso).toContainText('un administrador apruebe el permiso de lectura de archivos (Files.Read.All)');
    await expect(aviso).toContainText('Conceder consentimiento de administrador');
    expect(sim.registro.autorizaciones).toHaveLength(2);
    expect(sim.registro.descargas).toBe(0);

    // "Volver a iniciar sesión" pide ahora todos los permisos de una vez.
    await aviso.getByRole('button', { name: 'Volver a iniciar sesión' }).click();
    await expect.poll(() => sim.registro.autorizaciones.length).toBe(3);
    expect(sim.registro.autorizaciones[2].searchParams.get('scope')).toContain('Files.Read.All');
    expect(errores).toEqual([]);
  });

  test('cuenta de otro dominio: "Tu cuenta no tiene acceso" y no se lee el Excel', async ({ page }) => {
    const sim = await simularMicrosoft(page, { correo: 'alguien@gmail.com' });
    await iniciarSesionSimulada(page, sim);
    await expect(page.getByRole('heading', { name: 'Tu cuenta no tiene acceso' })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#mensaje-cuerpo')).toContainText('alguien@gmail.com');
    await expect(page.locator('#mensaje-cuerpo')).toContainText('@aic.pe o @jaicoscorp.com');
    await expect(page.getByRole('button', { name: 'Usar otra cuenta' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
    expect(sim.registro.graph).toHaveLength(0);
    expect(sim.registro.descargas).toBe(0);
    // La sesión local se borró: al recargar vuelve a pedir inicio de sesión.
    await page.reload();
    await expect(page.getByRole('button', { name: 'Iniciar sesión con Microsoft' })).toBeVisible();
  });

  test('enlace de descarga vencido: pide uno nuevo a Graph (sin usar /content) y carga igual', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    const sim = await simularMicrosoft(page, { correo: 'persona.prueba@aic.pe', enlacesVencidos: 1 });
    await iniciarSesionSimulada(page, sim);
    await expect(page.locator('#contador')).toContainText('Mostrando', { timeout: 15_000 });
    await expect(page.locator('#aviso-error')).toBeHidden();
    expect(sim.registro.graph.map((g) => g.url.replace(/u![^/]*/, 'u!…'))).toEqual([
      'https://graph.microsoft.com/v1.0/shares/u!…/driveItem',
      'https://graph.microsoft.com/v1.0/shares/u!…/driveItem',
    ]);
    // El segundo pedido también llevó el token.
    expect(sim.registro.graph[1].auth).toBe('Bearer token-de-acceso-de-prueba');
    expect(sim.registro.graph.some((g) => g.url.endsWith('/content'))).toBe(false);
    expect(sim.registro.descargas).toBe(1);
    expect(errores).toEqual([]);
  });

  test('enlace del navegador (Doc.aspx): si Graph no lo abre como enlace, encuentra el Excel buscándolo en SharePoint', async ({ page }) => {
    const errores = [];
    page.on('pageerror', (e) => errores.push(e.message));
    const graph = (url) => {
      const ruta = decodeURIComponent(url.pathname).replace('/v1.0', '');
      const consulta = decodeURIComponent(url.search);
      if (ruta.startsWith('/shares/')) return { status: 400, json: { error: { code: 'invalidRequest' } } };
      if (ruta === '/sites/jaicoscorp.sharepoint.com/drives') return { json: { value: [{ id: 'b!docs', name: 'Documentos' }] } };
      if (ruta === `/drives/b!docs/items/${GUID_EXCEL}`) return { status: 404, json: { error: { code: 'itemNotFound' } } };
      if (ruta === "/drives/b!docs/root/search(q='centros-negocio-aic.xlsx')") {
        return { json: { value: [{ id: '01REAL', name: 'centros-negocio-aic.xlsx', file: {} }] } };
      }
      if (ruta === '/drives/b!docs/items/01REAL' && consulta.includes('sharepointIds')) {
        return { json: { id: '01REAL', name: 'centros-negocio-aic.xlsx', file: {}, sharepointIds: { listItemUniqueId: GUID_EXCEL } } };
      }
      if (ruta === '/drives/b!docs/items/01REAL') {
        return {
          json: {
            id: '01REAL',
            name: 'centros-negocio-aic.xlsx',
            eTag: '"{REAL},1"',
            lastModifiedDateTime: '2026-10-12T15:30:00Z',
            file: {},
            parentReference: { driveId: 'b!docs' },
            '@microsoft.graph.downloadUrl': 'https://jaicoscorp.sharepoint.com/_layouts/15/download.aspx?temporal=2',
          },
        };
      }
      return { status: 404, json: { error: { code: 'itemNotFound' } } };
    };
    const sim = await simularMicrosoft(page, { correo: 'persona.prueba@aic.pe', urlExcel: URL_DOC, graph });
    await iniciarSesionSimulada(page, sim);
    await expect(page.locator('#contador')).toContainText('Mostrando', { timeout: 15_000 });
    await expect(page.locator('#aviso-error')).toBeHidden();
    await expect(page.locator('#texto-actualizado')).toContainText('Excel modificado el 12/10/2026');

    const rutas = sim.registro.graph.map((g) => decodeURIComponent(g.url).replace('https://graph.microsoft.com/v1.0', ''));
    expect(rutas).toEqual([
      expect.stringMatching(/^\/shares\/u!.+\/driveItem$/),
      '/sites/jaicoscorp.sharepoint.com/drives?$select=id,name,driveType',
      `/drives/b!docs/items/${GUID_EXCEL}?$select=id,name,file,folder,sharepointIds`,
      "/drives/b!docs/root/search(q='centros-negocio-aic.xlsx')",
      '/drives/b!docs/items/01REAL?$select=id,name,file,folder,sharepointIds',
      '/drives/b!docs/items/01REAL',
    ]);
    for (const g of sim.registro.graph) expect(g.auth).toBe('Bearer token-de-acceso-de-prueba');
    expect(sim.registro.descargas).toBe(1);

    // Monto y Moneda ocultos; filtro Estado disponible.
    await expect(page.locator('#tabla-resultados thead')).not.toContainText('Monto');
    await expect(page.locator('#tabla-resultados thead')).not.toContainText('Moneda');
    await expect(page.getByLabel('Estado', { exact: true })).toBeVisible();

    // "Columnas detectadas" muestra driveId e itemId (para fijarlos en config.json si hiciera falta).
    await page.locator('.detalles-columnas summary').click();
    const ubicacion = page.locator('#info-columnas .ubicacion-excel');
    await expect(ubicacion).toContainText('búsqueda en SharePoint');
    await expect(ubicacion).toContainText('driveId: b!docs');
    await expect(ubicacion).toContainText('itemId: 01REAL');

    // "Actualizar" ya no repite la búsqueda: va directo al archivo encontrado.
    const antes = sim.registro.graph.length;
    await page.getByRole('button', { name: 'Actualizar' }).click();
    await expect(page.locator('#aviso-flotante')).toContainText('Datos actualizados');
    expect(sim.registro.graph.slice(antes).map((g) => g.url)).toEqual(['https://graph.microsoft.com/v1.0/drives/b!docs/items/01REAL']);
    expect(sim.registro.descargas).toBe(2);
    expect(errores).toEqual([]);
  });

  test('si Graph tampoco lo encuentra: mensaje claro en español', async ({ page }) => {
    const graph = (url) => {
      const ruta = decodeURIComponent(url.pathname).replace('/v1.0', '');
      if (ruta === '/sites/jaicoscorp.sharepoint.com/drives') return { json: { value: [{ id: 'b!docs', name: 'Documentos' }] } };
      if (ruta.includes('/search(')) return { json: { value: [] } };
      return { status: 404, json: { error: { code: 'itemNotFound' } } };
    };
    const sim = await simularMicrosoft(page, { correo: 'persona.prueba@aic.pe', urlExcel: URL_DOC, graph });
    await iniciarSesionSimulada(page, sim);
    await expect(page.locator('#aviso-error')).toContainText('No se encontró el Excel "centros-negocio-aic.xlsx"', { timeout: 15_000 });
    await expect(page.locator('#aviso-error')).toContainText('Revisa que tu cuenta pueda abrirlo en SharePoint');
    expect(sim.registro.descargas).toBe(0);
  });

  test('auto-actualización: solo vuelve a descargar el Excel si cambió', async ({ page }) => {
    // Cada 3 segundos (solo para la prueba).
    const sim = await simularMicrosoft(page, { correo: 'persona.prueba@jaicoscorp.com', cambiosConfig: { autoActualizarMinutos: 0.05 } });
    await iniciarSesionSimulada(page, sim);
    await expect(page.locator('#contador')).toContainText('Mostrando', { timeout: 15_000 });
    expect(sim.registro.descargas).toBe(1);

    // El Excel no cambió: se consulta Graph (metadatos) pero NO se descarga de nuevo.
    await expect.poll(() => sim.registro.graph.length, { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
    expect(sim.registro.descargas).toBe(1);

    // El bot guardó el Excel (cambia el eTag): en la siguiente vuelta se descarga.
    sim.registro.eTag = '"{EJEMPLO},2"';
    await expect.poll(() => sim.registro.descargas, { timeout: 10_000 }).toBe(2);
    await expect(page.getByLabel('Buscar', { exact: true })).toHaveValue('cableado');
    await expect(page.locator('#aviso-error')).toBeHidden();
  });
});
