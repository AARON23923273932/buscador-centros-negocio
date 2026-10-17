import { describe, expect, it, vi } from 'vitest';
import {
  codificarUrlCompartida,
  descargarDesdeGraph,
  ErrorDatos,
  GRAPH_BASE,
  obtenerMetadatos,
  rutaItem,
} from '../../src/logica/graph.ts';
import type { OpcionesPedido } from '../../src/logica/tipos.ts';

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } });

describe('codificarUrlCompartida', () => {
  it('coincide con el ejemplo de la documentación de Microsoft Graph', () => {
    expect(codificarUrlCompartida('https://onedrive.live.com/redir?resid=1231244193912!12&authKey=1201919!12921!1')).toBe(
      'u!aHR0cHM6Ly9vbmVkcml2ZS5saXZlLmNvbS9yZWRpcj9yZXNpZD0xMjMxMjQ0MTkzOTEyITEyJmF1dGhLZXk9MTIwMTkxOSExMjkyMSEx',
    );
  });
  it('soporta tildes/ñ (UTF-8) y usa base64url sin relleno', () => {
    const r = codificarUrlCompartida('https://aic.sharepoint.com/:x:/s/Demo/EañoÑ?e=abc');
    expect(r).toBe('u!aHR0cHM6Ly9haWMuc2hhcmVwb2ludC5jb20vOng6L3MvRGVtby9FYcOxb8ORP2U9YWJj');
    expect(r).not.toMatch(/[=+/]/);
  });
});

describe('rutaItem', () => {
  it('prefiere driveId + itemId', () => {
    expect(rutaItem({ driveId: 'b!abc', itemId: '01XYZ', urlCompartida: 'https://x' })).toBe('/drives/b!abc/items/01XYZ');
  });
  it('usa /shares con el enlace', () => {
    expect(rutaItem({ urlCompartida: 'https://x' })).toMatch(/^\/shares\/u!.+\/driveItem$/);
  });
  it('sin datos: error de configuración', () => {
    expect(() => rutaItem({})).toThrow(ErrorDatos);
  });
});

describe('obtenerMetadatos', () => {
  it('envía el token y lee fecha de modificación y enlace de descarga', async () => {
    const fetchFalso = vi.fn(async (_url: string, _opciones?: OpcionesPedido) =>
      json({
        id: '1',
        name: 'Centros.xlsx',
        eTag: '"{A},5"',
        lastModifiedDateTime: '2026-10-09T19:10:00Z',
        webUrl: 'https://x/Centros.xlsx',
        '@microsoft.graph.downloadUrl': 'https://descarga.temporal/abc',
      }),
    );
    const meta = await obtenerMetadatos({ urlCompartida: 'https://x' }, 'TOKEN', fetchFalso);
    const [url, opciones] = fetchFalso.mock.calls[0];
    expect(url.startsWith(`${GRAPH_BASE}/shares/u!`)).toBe(true);
    expect(opciones?.headers?.Authorization).toBe('Bearer TOKEN');
    expect(opciones?.headers?.Prefer).toBe('redeemSharingLinkIfNecessary');
    expect(meta).toMatchObject({ nombre: 'Centros.xlsx', eTag: '"{A},5"', urlDescarga: 'https://descarga.temporal/abc' });
    expect(meta.modificado?.toISOString()).toBe('2026-10-09T19:10:00.000Z');
  });

  it.each([
    [401, 'sesion'],
    [403, 'sin-permiso'],
    [404, 'no-encontrado'],
    [429, 'ocupado'],
    [500, 'otro'],
  ])('respuesta %i -> error "%s"', async (status: number, tipo: string) => {
    const fetchFalso = async () => json({ error: { code: 'accessDenied' } }, status);
    await expect(obtenerMetadatos({ driveId: 'd', itemId: 'i' }, 'T', fetchFalso)).rejects.toMatchObject({ tipo });
  });

  it('sin red: error "sin-red"', async () => {
    const fetchFalso = async () => {
      throw new TypeError('Failed to fetch');
    };
    await expect(obtenerMetadatos({ driveId: 'd', itemId: 'i' }, 'T', fetchFalso)).rejects.toMatchObject({ tipo: 'sin-red' });
  });

  it('una carpeta no es un Excel', async () => {
    await expect(obtenerMetadatos({ driveId: 'd', itemId: 'i' }, 'T', async () => json({ folder: {} }))).rejects.toMatchObject({
      tipo: 'configuracion',
    });
  });
});

describe('descargarDesdeGraph', () => {
  it('descarga con el enlace temporal SIN enviar el token', async () => {
    const fetchFalso = vi.fn(async (url: string, _opciones?: OpcionesPedido) => {
      if (url.startsWith(GRAPH_BASE)) {
        return json({ name: 'C.xlsx', eTag: 'e1', '@microsoft.graph.downloadUrl': 'https://descarga.temporal/abc' });
      }
      return new Response(new Uint8Array([9, 9]));
    });
    const r = await descargarDesdeGraph({ driveId: 'd', itemId: 'i' }, async () => 'TOKEN', fetchFalso);
    expect(new Uint8Array(r.contenido)).toEqual(new Uint8Array([9, 9]));
    const [urlDescarga, opciones] = fetchFalso.mock.calls[1];
    expect(urlDescarga).toBe('https://descarga.temporal/abc');
    expect(opciones?.headers).toBeUndefined();
    expect(r.eTag).toBe('e1');
  });

  it('si el enlace temporal venció (403), pide uno nuevo una vez y NUNCA usa /content', async () => {
    let pedidosMeta = 0;
    const fetchFalso = vi.fn(async (url: string, _opciones?: OpcionesPedido) => {
      if (url.startsWith(GRAPH_BASE)) {
        pedidosMeta++;
        return json({ name: 'C.xlsx', '@microsoft.graph.downloadUrl': `https://descarga.temporal/${pedidosMeta}` });
      }
      return url.endsWith('/1') ? new Response('', { status: 403 }) : new Response(new Uint8Array([7]));
    });
    const r = await descargarDesdeGraph({ urlCompartida: 'https://x' }, async () => 'TOKEN', fetchFalso);
    expect(new Uint8Array(r.contenido)).toEqual(new Uint8Array([7]));
    expect(fetchFalso.mock.calls.map(([url]) => url.replace(/u!.*\//, 'u!…/'))).toEqual([
      `${GRAPH_BASE}/shares/u!…/driveItem`,
      'https://descarga.temporal/1',
      `${GRAPH_BASE}/shares/u!…/driveItem`,
      'https://descarga.temporal/2',
    ]);
    expect(fetchFalso.mock.calls[2][1]?.headers?.Prefer).toBe('redeemSharingLinkIfNecessary');
  });

  it('si Graph no entrega enlace temporal: error claro "descarga" (sin llamar a /content)', async () => {
    const fetchFalso = vi.fn(async (_url: string) => json({ name: 'C.xlsx' }));
    await expect(descargarDesdeGraph({ driveId: 'd', itemId: 'i' }, async () => 'TOKEN', fetchFalso)).rejects.toMatchObject({
      tipo: 'descarga',
      message: expect.stringMatching(/No se pudo descargar el Excel/),
    });
    expect(fetchFalso.mock.calls.some(([url]) => url.endsWith('/content'))).toBe(false);
  });

  it('si falla la descarga del enlace temporal, NO dice "no hay conexión a internet" a secas', async () => {
    const fetchFalso = vi.fn(async (url: string) => {
      if (url.startsWith(GRAPH_BASE)) return json({ name: 'C.xlsx', '@microsoft.graph.downloadUrl': 'https://descarga.temporal/x' });
      throw new TypeError('Failed to fetch');
    });
    await expect(descargarDesdeGraph({ driveId: 'd', itemId: 'i' }, async () => 'TOKEN', fetchFalso)).rejects.toMatchObject({
      tipo: 'descarga',
    });
  });
});

describe('mensaje de "sin permiso" (403)', () => {
  it('orienta también al administrador si a todos les pasa lo mismo', async () => {
    const e = (await obtenerMetadatos({ urlCompartida: 'https://x' }, 'T', async () => json({}, 403)).catch((x: unknown) => x)) as ErrorDatos;
    expect(e.tipo).toBe('sin-permiso');
    expect(e.message).toMatch(/acceso de lectura/);
    expect(e.message).toMatch(/Si a todas las personas les pasa lo mismo/);
    expect(e.message).toMatch(/Entra ID/);
  });
});
