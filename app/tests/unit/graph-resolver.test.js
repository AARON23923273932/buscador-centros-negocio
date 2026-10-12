// Pruebas de cómo la app encuentra el Excel real a partir de su enlace (graph.js), con un Graph SIMULADO:
// ninguna petición sale a internet. Cubren el enlace de "Copiar vínculo" y la dirección del navegador
// de Excel Online (…/_layouts/15/Doc.aspx?sourcedoc={GUID}&file=Nombre.xlsx), que es la que dio el usuario.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  analizarUrlNavegador,
  codificarUrlCompartida,
  descargarDesdeGraph,
  ErrorDatos,
  GRAPH_BASE,
  MAX_PAGINAS,
  obtenerMetadatos,
  rutaBusqueda,
} from '../../src/graph.js';

const json = (cuerpo, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });

const GUID_EXCEL = 'e20faa1a-1e42-416b-ba9f-a6fcf00e07c8';
// El enlace real que dio el usuario (dirección del navegador de Excel Online, sitio raíz).
const URL_DOC =
  'https://jaicoscorp.sharepoint.com/:x:/r/_layouts/15/Doc.aspx?sourcedoc=%7BE20FAA1A-1E42-416B-BA9F-A6FCF00E07C8%7D' +
  '&file=centros-negocio-aic.xlsx&action=default&mobileredirect=true&wdwpf=doclib-c';
const ENLACE_COMPARTIR = 'https://jaicoscorp.sharepoint.com/:x:/s/Area/EAbc123?e=XyZ';
const SELECT_IDS = '?$select=id,name,file,folder,sharepointIds';
const DRIVES_RAIZ = '/sites/jaicoscorp.sharepoint.com/drives?$select=id,name,driveType';
const SHARES_DOC = `/shares/${codificarUrlCompartida(URL_DOC)}/driveItem`;
const BUSCAR_NOMBRE = (driveId) => `/drives/${driveId}/root/search(q='centros-negocio-aic.xlsx')`;

/**
 * "Graph falso": responde según la ruta EXACTA pedida (lo que va después de /v1.0).
 * Una ruta que no está en la lista responde 404, como Graph cuando no encuentra algo.
 * Fuera de Graph (el enlace temporal de descarga) responde con 3 bytes.
 */
function graphFalso(rutas) {
  const fetchFalso = vi.fn(async (url) => {
    if (!url.startsWith(GRAPH_BASE)) return new Response(new Uint8Array([1, 2, 3]));
    const ruta = url.slice(GRAPH_BASE.length);
    const r = typeof rutas[ruta] === 'function' ? rutas[ruta]() : rutas[ruta];
    if (r === undefined) return json({ error: { code: 'itemNotFound' } }, 404);
    return r instanceof Response ? r : json(r);
  });
  fetchFalso.rutas = () => fetchFalso.mock.calls.map(([url]) => url.slice(GRAPH_BASE.length));
  return fetchFalso;
}

/** sessionStorage de mentira. */
function almacenFalso() {
  const datos = new Map();
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => datos.set(k, String(v)),
    removeItem: (k) => datos.delete(k),
  };
}

/** Respuesta completa de Graph para un archivo (la que trae el enlace temporal de descarga). */
const itemCompleto = (id, driveId) => ({
  id,
  name: 'centros-negocio-aic.xlsx',
  eTag: `"{${id}},3"`,
  file: {},
  lastModifiedDateTime: '2026-10-12T15:00:00Z',
  parentReference: { driveId },
  '@microsoft.graph.downloadUrl': `https://jaicoscorp.sharepoint.com/descarga/${id}`,
});

/** Silencia (y deja revisar) los avisos de consola que la app escribe al buscar. */
const silenciarAvisos = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('analizarUrlNavegador', () => {
  it('reconoce el enlace real del usuario (sitio raíz, con "/:x:/r")', () => {
    expect(analizarUrlNavegador(URL_DOC)).toEqual({
      host: 'jaicoscorp.sharepoint.com',
      rutaSitio: '',
      guid: GUID_EXCEL,
      nombre: 'centros-negocio-aic.xlsx',
    });
  });
  it('acepta la ruta de un sitio (/sites o /teams), con o sin "/:x:/r"', () => {
    const resto = '/_layouts/15/Doc.aspx?sourcedoc={E20FAA1A-1E42-416B-BA9F-A6FCF00E07C8}&file=X.xlsx';
    expect(analizarUrlNavegador(`https://aic.sharepoint.com/:x:/r/sites/Ventas${resto}`).rutaSitio).toBe('/sites/Ventas');
    expect(analizarUrlNavegador(`https://aic.sharepoint.com/teams/Area${resto}`).rutaSitio).toBe('/teams/Area');
    expect(analizarUrlNavegador(`https://aic.sharepoint.com${resto}`)).toMatchObject({
      rutaSitio: '',
      guid: GUID_EXCEL,
      nombre: 'X.xlsx',
    });
  });
  it('un enlace de "Copiar vínculo", una dirección sin sourcedoc o un texto cualquiera: null', () => {
    expect(analizarUrlNavegador(ENLACE_COMPARTIR)).toBeNull();
    expect(analizarUrlNavegador('https://aic.sharepoint.com/_layouts/15/Doc.aspx?file=X.xlsx')).toBeNull();
    expect(analizarUrlNavegador('no es un enlace')).toBeNull();
  });
});

describe('rutaBusqueda', () => {
  it('escribe la búsqueda como pide Graph (comilla simple doble y texto codificado)', () => {
    expect(rutaBusqueda('b!docs', 'centros-negocio-aic.xlsx')).toBe(BUSCAR_NOMBRE('b!docs'));
    expect(rutaBusqueda('b!docs', "O'Brien & Cía.xlsx")).toBe("/drives/b!docs/root/search(q='O''Brien%20%26%20C%C3%ADa.xlsx')");
  });
});

describe('obtenerMetadatos — cómo se encuentra el Excel', () => {
  it('enlace de compartir que Graph abre: se usa tal cual y no se busca nada', async () => {
    const almacen = almacenFalso();
    const fetchFalso = graphFalso({
      [`/shares/${codificarUrlCompartida(ENLACE_COMPARTIR)}/driveItem`]: itemCompleto('01ITEM', 'b!docs'),
    });
    const meta = await obtenerMetadatos({ urlCompartida: ENLACE_COMPARTIR }, 'T', fetchFalso, { almacen });
    expect(meta).toMatchObject({ origen: 'enlace', driveId: 'b!docs', itemId: '01ITEM', urlDescarga: expect.any(String) });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(fetchFalso.mock.calls[0][1].headers.Prefer).toBe('redeemSharingLinkIfNecessary');
    // Un enlace de compartir no se cambia por driveId/itemId (podría dar acceso solo a través del enlace).
    expect(almacen.datos.size).toBe(0);
  });

  it('Doc.aspx: si /shares falla, busca en las bibliotecas del sitio y elige el archivo con el mismo GUID', async () => {
    const avisos = silenciarAvisos();
    const almacen = almacenFalso();
    const fetchFalso = graphFalso({
      [SHARES_DOC]: json({ error: { code: 'invalidRequest' } }, 400),
      [DRIVES_RAIZ]: { value: [{ id: 'b!docs', name: 'Documentos' }, { id: 'b!otros', name: 'Activos del sitio' }] },
      // Por nombre aparece una copia (otro GUID) en "Documentos" y el original en "Activos del sitio".
      [BUSCAR_NOMBRE('b!docs')]: {
        value: [
          { id: '01COPIA', name: 'centros-negocio-aic.xlsx', file: {} },
          { id: '01PARECIDO', name: 'centros-negocio-aic (1).xlsx', file: {} },
        ],
      },
      [BUSCAR_NOMBRE('b!otros')]: { value: [{ id: '01REAL', name: 'Centros-Negocio-AIC.xlsx', file: {} }] },
      [`/drives/b!docs/items/01COPIA${SELECT_IDS}`]: {
        id: '01COPIA',
        sharepointIds: { listItemUniqueId: '11111111-0000-0000-0000-000000000000' },
      },
      [`/drives/b!otros/items/01REAL${SELECT_IDS}`]: {
        id: '01REAL',
        sharepointIds: { listItemUniqueId: `{${GUID_EXCEL.toUpperCase()}}` },
      },
      '/drives/b!otros/items/01REAL': itemCompleto('01REAL', 'b!otros'),
    });
    const meta = await obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen });
    expect(meta).toMatchObject({ origen: 'busqueda', driveId: 'b!otros', itemId: '01REAL', nombre: 'centros-negocio-aic.xlsx' });
    expect(fetchFalso.rutas()).toEqual([
      SHARES_DOC,
      DRIVES_RAIZ,
      `/drives/b!docs/items/${GUID_EXCEL}${SELECT_IDS}`, // directo por el GUID: 404 en las dos bibliotecas
      `/drives/b!otros/items/${GUID_EXCEL}${SELECT_IDS}`,
      BUSCAR_NOMBRE('b!docs'),
      BUSCAR_NOMBRE('b!otros'),
      `/drives/b!docs/items/01COPIA${SELECT_IDS}`,
      `/drives/b!otros/items/01REAL${SELECT_IDS}`,
      '/drives/b!otros/items/01REAL',
    ]);
    // Todas las consultas llevan el token; solo /shares lleva el encabezado "Prefer".
    for (const [, opciones] of fetchFalso.mock.calls) expect(opciones.headers.Authorization).toBe('Bearer T');
    expect(fetchFalso.mock.calls.filter(([, o]) => o.headers.Prefer)).toHaveLength(1);
    // Queda guardado para esta pestaña.
    expect([...almacen.datos.keys()]).toEqual([`buscador-cn.excel-resuelto:${URL_DOC}`]);
    expect(JSON.parse([...almacen.datos.values()][0])).toEqual({ driveId: 'b!otros', itemId: '01REAL' });
    expect(avisos).toHaveBeenCalled();
  });

  it('Doc.aspx: si Graph acepta el GUID como id del archivo, no hace falta buscar por nombre', async () => {
    silenciarAvisos();
    const fetchFalso = graphFalso({
      [SHARES_DOC]: json({}, 403),
      [DRIVES_RAIZ]: { value: [{ id: 'b!docs', name: 'Documentos' }] },
      [`/drives/b!docs/items/${GUID_EXCEL}${SELECT_IDS}`]: {
        id: '01REAL',
        name: 'centros-negocio-aic.xlsx',
        file: {},
        sharepointIds: { listItemUniqueId: GUID_EXCEL },
      },
      '/drives/b!docs/items/01REAL': itemCompleto('01REAL', 'b!docs'),
    });
    const meta = await obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null });
    expect(meta).toMatchObject({ origen: 'busqueda', driveId: 'b!docs', itemId: '01REAL' });
    expect(fetchFalso.rutas().some((r) => r.includes('/search('))).toBe(false);
  });

  it('Doc.aspx raíz vs /sites/X: las bibliotecas se piden al sitio del enlace, sin pedir el sitio aparte', async () => {
    silenciarAvisos();
    const url = URL_DOC.replace('/:x:/r/_layouts', '/:x:/r/sites/Operaciones/_layouts');
    const drivesSitio = '/sites/jaicoscorp.sharepoint.com:/sites/Operaciones:/drives?$select=id,name,driveType';
    const fetchFalso = graphFalso({
      [`/shares/${codificarUrlCompartida(url)}/driveItem`]: json({}, 404),
      [drivesSitio]: { value: [{ id: 'b!ops', name: 'Documentos' }] },
      [`/drives/b!ops/items/${GUID_EXCEL}${SELECT_IDS}`]: { id: '01OPS', file: {}, sharepointIds: { listItemUniqueId: GUID_EXCEL } },
      '/drives/b!ops/items/01OPS': itemCompleto('01OPS', 'b!ops'),
    });
    const meta = await obtenerMetadatos({ urlCompartida: url }, 'T', fetchFalso, { almacen: null });
    expect(meta.itemId).toBe('01OPS');
    expect(fetchFalso.rutas()[1]).toBe(drivesSitio);
    expect(fetchFalso.rutas()).not.toContain(DRIVES_RAIZ);
    // Nunca se pide GET /sites/{sitio} solo: según la documentación de Graph exige el permiso Sites.Read.All.
    expect(fetchFalso.rutas().some((r) => /^\/sites\/[^/]+$/.test(r.split('?')[0]))).toBe(false);
  });

  it('varios archivos con el mismo nombre y ninguno con el GUID: error claro (no adivina)', async () => {
    silenciarAvisos();
    const fetchFalso = graphFalso({
      [SHARES_DOC]: json({}, 404),
      [DRIVES_RAIZ]: { value: [{ id: 'b!docs' }] },
      [BUSCAR_NOMBRE('b!docs')]: {
        value: [
          { id: '01A', name: 'centros-negocio-aic.xlsx', file: {} },
          { id: '01B', name: 'centros-negocio-aic.xlsx', file: {} },
          { id: '01CARPETA', name: 'centros-negocio-aic.xlsx', folder: {} }, // las carpetas no cuentan
        ],
      },
      [`/drives/b!docs/items/01A${SELECT_IDS}`]: { id: '01A', sharepointIds: { listItemUniqueId: '11111111-0000-0000-0000-000000000000' } },
      [`/drives/b!docs/items/01B${SELECT_IDS}`]: { id: '01B', sharepointIds: { listItemUniqueId: '22222222-0000-0000-0000-000000000000' } },
    });
    await expect(obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null })).rejects.toMatchObject({
      tipo: 'no-encontrado',
      message: expect.stringMatching(/Se encontraron 2 archivos llamados "centros-negocio-aic\.xlsx"/),
    });
  });

  it('un solo archivo con ese nombre (aunque su GUID no coincida): se usa, con un aviso en la consola', async () => {
    const avisos = silenciarAvisos();
    const fetchFalso = graphFalso({
      [SHARES_DOC]: json({}, 404),
      [DRIVES_RAIZ]: { value: [{ id: 'b!docs' }] },
      [BUSCAR_NOMBRE('b!docs')]: { value: [{ id: '01UNICO', name: 'centros-negocio-aic.xlsx', file: {} }] },
      [`/drives/b!docs/items/01UNICO${SELECT_IDS}`]: {
        id: '01UNICO',
        sharepointIds: { listItemUniqueId: '33333333-0000-0000-0000-000000000000' },
      },
      '/drives/b!docs/items/01UNICO': itemCompleto('01UNICO', 'b!docs'),
    });
    const meta = await obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null });
    expect(meta.itemId).toBe('01UNICO');
    expect(avisos.mock.calls.some(([m]) => /se encontró por su nombre/.test(m))).toBe(true);
  });

  it('ninguno: error claro en español (y se probó también el nombre sin ".xlsx")', async () => {
    silenciarAvisos();
    const fetchFalso = graphFalso({
      [SHARES_DOC]: json({}, 404),
      [DRIVES_RAIZ]: { value: [{ id: 'b!docs' }] },
      [BUSCAR_NOMBRE('b!docs')]: { value: [] },
      ["/drives/b!docs/root/search(q='centros-negocio-aic')"]: {
        value: [{ id: '01X', name: 'centros-negocio-aic-2025.xlsx', file: {} }],
      },
    });
    const error = await obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null }).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorDatos);
    expect(error.tipo).toBe('no-encontrado');
    expect(error.message).toMatch(/No se encontró el Excel "centros-negocio-aic\.xlsx" en SharePoint \(jaicoscorp\.sharepoint\.com\)/);
    expect(error.message).toMatch(/Revisa que tu cuenta pueda abrirlo en SharePoint/);
    expect(fetchFalso.rutas()).toContain("/drives/b!docs/root/search(q='centros-negocio-aic')");
  });

  it('memoria de la pestaña: la siguiente vez va directo; si el archivo ya no está (404), busca de nuevo UNA vez', async () => {
    silenciarAvisos();
    const almacen = almacenFalso();
    let idActual = '01VIEJO';
    const fetchFalso = graphFalso({
      [SHARES_DOC]: json({}, 404),
      [DRIVES_RAIZ]: { value: [{ id: 'b!docs' }] },
      [`/drives/b!docs/items/${GUID_EXCEL}${SELECT_IDS}`]: () => ({
        id: idActual,
        file: {},
        sharepointIds: { listItemUniqueId: GUID_EXCEL },
      }),
      '/drives/b!docs/items/01VIEJO': () => (idActual === '01VIEJO' ? json(itemCompleto('01VIEJO', 'b!docs')) : json({}, 404)),
      '/drives/b!docs/items/01NUEVO': itemCompleto('01NUEVO', 'b!docs'),
    });
    const primera = await obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen });
    expect(primera.origen).toBe('busqueda');

    // Actualización automática: una sola consulta, directo al archivo.
    fetchFalso.mockClear();
    const segunda = await obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen });
    expect(segunda).toMatchObject({ origen: 'memoria', itemId: '01VIEJO' });
    expect(fetchFalso.rutas()).toEqual(['/drives/b!docs/items/01VIEJO']);

    // El bot volvió a crear el archivo (nuevo id): 404 -> se olvida lo guardado y se busca otra vez.
    idActual = '01NUEVO';
    fetchFalso.mockClear();
    const tercera = await obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen });
    expect(tercera).toMatchObject({ origen: 'busqueda', itemId: '01NUEVO' });
    expect(fetchFalso.rutas()[0]).toBe('/drives/b!docs/items/01VIEJO');
    expect(fetchFalso.rutas().filter((r) => r === DRIVES_RAIZ)).toHaveLength(1);
    expect(JSON.parse([...almacen.datos.values()][0]).itemId).toBe('01NUEVO');
  });

  it('si lo guardado ya no existe y tampoco se encuentra: error (sin repetir la búsqueda en bucle)', async () => {
    silenciarAvisos();
    const almacen = almacenFalso();
    almacen.setItem(`buscador-cn.excel-resuelto:${URL_DOC}`, JSON.stringify({ driveId: 'b!docs', itemId: '01BORRADO' }));
    const fetchFalso = graphFalso({ [SHARES_DOC]: json({}, 404), [DRIVES_RAIZ]: { value: [{ id: 'b!docs' }] } });
    await expect(obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen })).rejects.toMatchObject({
      tipo: 'no-encontrado',
    });
    expect(fetchFalso.rutas()[0]).toBe('/drives/b!docs/items/01BORRADO');
    expect(fetchFalso.rutas().filter((r) => r === DRIVES_RAIZ)).toHaveLength(1);
    expect(almacen.datos.size).toBe(0);
  });

  it('sesión vencida (401) o enlace de compartir sin permiso (403): NO se busca, se avisa', async () => {
    const f401 = graphFalso({ [SHARES_DOC]: json({}, 401) });
    await expect(obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', f401, { almacen: null })).rejects.toMatchObject({
      tipo: 'sesion',
    });
    expect(f401).toHaveBeenCalledTimes(1);

    const f403 = graphFalso({ [`/shares/${codificarUrlCompartida(ENLACE_COMPARTIR)}/driveItem`]: json({}, 403) });
    await expect(obtenerMetadatos({ urlCompartida: ENLACE_COMPARTIR }, 'T', f403, { almacen: null })).rejects.toMatchObject({
      tipo: 'sin-permiso',
      status: 403,
    });
    expect(f403).toHaveBeenCalledTimes(1);
  });

  it('si no se pueden listar las bibliotecas del sitio (403): mensaje de "sin permiso"', async () => {
    silenciarAvisos();
    const fetchFalso = graphFalso({ [SHARES_DOC]: json({}, 404), [DRIVES_RAIZ]: json({ error: { code: 'accessDenied' } }, 403) });
    await expect(obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null })).rejects.toMatchObject({
      tipo: 'sin-permiso',
    });
  });

  it('driveId + itemId de config.json tienen prioridad (sin /shares ni búsqueda)', async () => {
    const fetchFalso = graphFalso({ '/drives/b!fijo/items/01FIJO': itemCompleto('01FIJO', 'b!fijo') });
    const datos = { urlCompartida: URL_DOC, driveId: 'b!fijo', itemId: '01FIJO' };
    const meta = await obtenerMetadatos(datos, 'T', fetchFalso, { almacen: null });
    expect(meta).toMatchObject({ origen: 'config', driveId: 'b!fijo', itemId: '01FIJO' });
    expect(fetchFalso.rutas()).toEqual(['/drives/b!fijo/items/01FIJO']);
  });

  it('descargarDesdeGraph devuelve también dónde se encontró el Excel', async () => {
    silenciarAvisos();
    const fetchFalso = graphFalso({
      [SHARES_DOC]: json({}, 404),
      [DRIVES_RAIZ]: { value: [{ id: 'b!docs' }] },
      [`/drives/b!docs/items/${GUID_EXCEL}${SELECT_IDS}`]: { id: '01REAL', file: {}, sharepointIds: { listItemUniqueId: GUID_EXCEL } },
      '/drives/b!docs/items/01REAL': itemCompleto('01REAL', 'b!docs'),
    });
    const r = await descargarDesdeGraph({ urlCompartida: URL_DOC }, async () => 'T', fetchFalso, { almacen: null });
    expect(r).toMatchObject({ driveId: 'b!docs', itemId: '01REAL', origen: 'busqueda' });
    expect(new Uint8Array(r.contenido)).toEqual(new Uint8Array([1, 2, 3]));
    // La descarga usa el enlace temporal, sin el token.
    expect(fetchFalso.mock.calls.at(-1)).toEqual(['https://jaicoscorp.sharepoint.com/descarga/01REAL', {}]);
  });
});

describe('obtenerMetadatos — casos difíciles de la búsqueda', () => {
  it('el Excel aparece en la SEGUNDA página de resultados de la búsqueda: sigue "@odata.nextLink"', async () => {
    silenciarAvisos();
    const pagina2 = `${GRAPH_BASE}/drives/b!docs/root/search(q='centros-negocio-aic.xlsx')?$skiptoken=P2`;
    const fetchFalso = graphFalso({
      [SHARES_DOC]: json({}, 404),
      [DRIVES_RAIZ]: { value: [{ id: 'b!docs' }] },
      [BUSCAR_NOMBRE('b!docs')]: {
        value: Array.from({ length: 3 }, (_, i) => ({ id: `01OTRO${i}`, name: `aic-${i}.xlsx`, file: {} })),
        '@odata.nextLink': pagina2,
      },
      [pagina2.slice(GRAPH_BASE.length)]: { value: [{ id: '01REAL', name: 'centros-negocio-aic.xlsx', file: {} }] },
      [`/drives/b!docs/items/01REAL${SELECT_IDS}`]: { id: '01REAL', sharepointIds: { listItemUniqueId: GUID_EXCEL } },
      '/drives/b!docs/items/01REAL': itemCompleto('01REAL', 'b!docs'),
    });
    const meta = await obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null });
    expect(meta).toMatchObject({ origen: 'busqueda', itemId: '01REAL' });
    // La página siguiente se pide tal cual (dirección completa, sin anteponer otra vez GRAPH_BASE) y con el token.
    const llamada = fetchFalso.mock.calls.find(([url]) => url === pagina2);
    expect(llamada[1].headers.Authorization).toBe('Bearer T');
  });

  it('la biblioteca correcta está en la SEGUNDA página de la lista de bibliotecas', async () => {
    silenciarAvisos();
    const pagina2 = `${GRAPH_BASE}/sites/jaicoscorp.sharepoint.com/drives?$select=id,name,driveType&$skiptoken=X`;
    const fetchFalso = graphFalso({
      [SHARES_DOC]: json({}, 404),
      [DRIVES_RAIZ]: { value: [{ id: 'b!uno' }], '@odata.nextLink': pagina2 },
      [pagina2.slice(GRAPH_BASE.length)]: { value: [{ id: 'b!dos' }] },
      [`/drives/b!dos/items/${GUID_EXCEL}${SELECT_IDS}`]: { id: '01REAL', file: {}, sharepointIds: { listItemUniqueId: GUID_EXCEL } },
      '/drives/b!dos/items/01REAL': itemCompleto('01REAL', 'b!dos'),
    });
    const meta = await obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null });
    expect(meta).toMatchObject({ driveId: 'b!dos', itemId: '01REAL' });
  });

  it(`lee como máximo ${MAX_PAGINAS} páginas y nunca envía el token fuera de graph.microsoft.com`, async () => {
    silenciarAvisos();
    // Cada página de la búsqueda apunta a la siguiente, sin fin; la de bibliotecas apunta a otro sitio.
    const rutas = {
      [SHARES_DOC]: json({}, 404),
      [DRIVES_RAIZ]: { value: [{ id: 'b!docs' }], '@odata.nextLink': 'https://otro-sitio.example.com/robar-token' },
      [`/drives/b!docs/items/${GUID_EXCEL}${SELECT_IDS}`]: json({}, 404),
    };
    for (let i = 0; i < 10; i++) {
      const ruta = i === 0 ? BUSCAR_NOMBRE('b!docs') : `${BUSCAR_NOMBRE('b!docs')}?$skiptoken=${i}`;
      rutas[ruta] = { value: [], '@odata.nextLink': `${GRAPH_BASE}${BUSCAR_NOMBRE('b!docs')}?$skiptoken=${i + 1}` };
    }
    const fetchFalso = graphFalso(rutas);
    await expect(obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null })).rejects.toMatchObject({
      tipo: 'no-encontrado',
    });
    expect(fetchFalso.rutas().filter((r) => r.startsWith(BUSCAR_NOMBRE('b!docs')))).toHaveLength(MAX_PAGINAS);
    expect(fetchFalso.mock.calls.some(([url]) => url.includes('otro-sitio.example.com'))).toBe(false);
  });

  it('una biblioteca responde 500 al pedir por GUID: se salta y se encuentra el Excel en la siguiente', async () => {
    silenciarAvisos();
    const fetchFalso = graphFalso({
      [SHARES_DOC]: json({}, 404),
      [DRIVES_RAIZ]: { value: [{ id: 'b!activos', name: 'Activos del sitio' }, { id: 'b!docs', name: 'Documentos' }] },
      [`/drives/b!activos/items/${GUID_EXCEL}${SELECT_IDS}`]: json({ error: { code: 'generalException' } }, 500),
      [`/drives/b!docs/items/${GUID_EXCEL}${SELECT_IDS}`]: { id: '01REAL', file: {}, sharepointIds: { listItemUniqueId: GUID_EXCEL } },
      '/drives/b!docs/items/01REAL': itemCompleto('01REAL', 'b!docs'),
    });
    const meta = await obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null });
    expect(meta).toMatchObject({ driveId: 'b!docs', itemId: '01REAL' });
  });

  it('si una biblioteca falló (500) y en las demás no aparece: se informa ese error (no "no se encontró")', async () => {
    silenciarAvisos();
    const fetchFalso = graphFalso({
      [SHARES_DOC]: json({}, 404),
      [DRIVES_RAIZ]: { value: [{ id: 'b!rota' }, { id: 'b!docs' }] },
      [BUSCAR_NOMBRE('b!rota')]: json({ error: { code: 'generalException' } }, 500),
      [BUSCAR_NOMBRE('b!docs')]: { value: [] },
    });
    await expect(obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null })).rejects.toMatchObject({
      tipo: 'otro',
      status: 500,
    });
    // Igual buscó en la otra biblioteca.
    expect(fetchFalso.rutas()).toContain(BUSCAR_NOMBRE('b!docs'));
  });

  it.each([
    [401, 'sesion'],
    [429, 'ocupado'],
  ])('respuesta %i en una biblioteca: se corta enseguida (error "%s")', async (status, tipo) => {
    silenciarAvisos();
    const fetchFalso = graphFalso({
      [SHARES_DOC]: json({}, 404),
      [DRIVES_RAIZ]: { value: [{ id: 'b!uno' }, { id: 'b!dos' }] },
      [`/drives/b!uno/items/${GUID_EXCEL}${SELECT_IDS}`]: json({}, status),
    });
    await expect(obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null })).rejects.toMatchObject({ tipo });
    expect(fetchFalso.rutas().some((r) => r.startsWith('/drives/b!dos'))).toBe(false);
  });

  it('Doc.aspx: si /shares devuelve una CARPETA, se busca el Excel en vez de dar un error de configuración', async () => {
    silenciarAvisos();
    const fetchFalso = graphFalso({
      [SHARES_DOC]: { id: '01CARPETA', name: 'Documentos compartidos', folder: { childCount: 3 } },
      [DRIVES_RAIZ]: { value: [{ id: 'b!docs' }] },
      [`/drives/b!docs/items/${GUID_EXCEL}${SELECT_IDS}`]: { id: '01REAL', file: {}, sharepointIds: { listItemUniqueId: GUID_EXCEL } },
      '/drives/b!docs/items/01REAL': itemCompleto('01REAL', 'b!docs'),
    });
    const meta = await obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null });
    expect(meta).toMatchObject({ origen: 'busqueda', itemId: '01REAL' });
  });

  it('enlace de "Copiar vínculo" que apunta a una carpeta: error de configuración (no hay con qué buscar)', async () => {
    const fetchFalso = graphFalso({
      [`/shares/${codificarUrlCompartida(ENLACE_COMPARTIR)}/driveItem`]: { id: '01CARPETA', folder: {} },
    });
    await expect(obtenerMetadatos({ urlCompartida: ENLACE_COMPARTIR }, 'T', fetchFalso, { almacen: null })).rejects.toMatchObject({
      tipo: 'configuracion',
    });
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('Doc.aspx: si /shares abre un archivo con OTRO nombre, se confirma buscando por el GUID', async () => {
    silenciarAvisos();
    const fetchFalso = graphFalso({
      [SHARES_DOC]: { ...itemCompleto('01OTRO', 'b!docs'), name: 'otra-cosa.xlsx' },
      [DRIVES_RAIZ]: { value: [{ id: 'b!docs' }] },
      [`/drives/b!docs/items/${GUID_EXCEL}${SELECT_IDS}`]: { id: '01REAL', file: {}, sharepointIds: { listItemUniqueId: GUID_EXCEL } },
      '/drives/b!docs/items/01REAL': itemCompleto('01REAL', 'b!docs'),
    });
    const meta = await obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null });
    expect(meta).toMatchObject({ origen: 'busqueda', itemId: '01REAL' });
  });

  it('Doc.aspx: otro nombre y la búsqueda no lo encuentra (ej. lo renombraron): se usa lo que abrió el enlace', async () => {
    const avisos = silenciarAvisos();
    const fetchFalso = graphFalso({
      [SHARES_DOC]: { ...itemCompleto('01RENOMBRADO', 'b!docs'), name: 'centros-negocio-aic-2026.xlsx' },
      [DRIVES_RAIZ]: { value: [{ id: 'b!docs' }] },
      [BUSCAR_NOMBRE('b!docs')]: { value: [] },
      ["/drives/b!docs/root/search(q='centros-negocio-aic')"]: { value: [] },
    });
    const meta = await obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null });
    expect(meta).toMatchObject({ origen: 'enlace', itemId: '01RENOMBRADO', nombre: 'centros-negocio-aic-2026.xlsx' });
    expect(avisos.mock.calls.some(([m]) => /se usa el archivo que abrió el enlace/.test(m))).toBe(true);
  });

  it('403 al listar las bibliotecas del sitio: explica que puede ser el permiso de la app y qué hacer', async () => {
    silenciarAvisos();
    const fetchFalso = graphFalso({ [SHARES_DOC]: json({}, 404), [DRIVES_RAIZ]: json({ error: { code: 'accessDenied' } }, 403) });
    const error = await obtenerMetadatos({ urlCompartida: URL_DOC }, 'T', fetchFalso, { almacen: null }).catch((e) => e);
    expect(error).toMatchObject({ tipo: 'sin-permiso', status: 403 });
    expect(error.message).toMatch(/No se pudo ver las bibliotecas de documentos del sitio de SharePoint \(jaicoscorp\.sharepoint\.com\)/);
    expect(error.message).toMatch(/"datos\.driveId" \+ "datos\.itemId"/);
    expect(error.message).toMatch(/Sites\.Read\.All con consentimiento de administrador/);
    expect(error.message).toContain('(código: accessDenied)');
  });
});
