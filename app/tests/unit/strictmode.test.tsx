// @vitest-environment jsdom
// Modo estricto de React (<StrictMode>, como en src/main.tsx): en desarrollo React ejecuta los efectos DOS
// veces a propósito, para encontrar errores. La app tiene dos defensas para que eso no cause problemas:
//   - useArranque (ref "iniciado"): MSAL procesa UNA sola vez la vuelta de Microsoft (handleRedirectPromise);
//   - useExcel (memoria.cargando): el Excel se descarga UNA sola vez.
// Las pruebas en navegador (Playwright) usan la versión compilada, donde StrictMode no actúa: por eso
// esta prueba monta la app completa dentro de <StrictMode> (modo microsoft + Graph, con MSAL simulado).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App.tsx';

const msal = vi.hoisted(() => {
  const cuenta = {
    homeAccountId: 'cuenta-1',
    environment: 'login.microsoftonline.com',
    tenantId: '11111111-2222-3333-4444-555555555555',
    localAccountId: 'cuenta-1',
    username: 'persona@aic.pe',
    name: 'Persona de Prueba',
  };
  const pca = {
    handleRedirectPromise: vi.fn(async () => null),
    getAllAccounts: vi.fn(() => [cuenta]),
    getActiveAccount: vi.fn(() => null),
    setActiveAccount: vi.fn(),
    clearCache: vi.fn(async () => {}),
    loginRedirect: vi.fn(async () => {}),
    logoutRedirect: vi.fn(async () => {}),
    acquireTokenSilent: vi.fn(async () => ({ accessToken: 'token-de-prueba' })),
    acquireTokenRedirect: vi.fn(async () => {}),
  };
  return { cuenta, pca, crear: vi.fn(async () => pca) };
});

vi.mock('@azure/msal-browser', () => ({
  InteractionRequiredAuthError: class InteractionRequiredAuthError extends Error {},
  createStandardPublicClientApplication: msal.crear,
}));

const GUID = '11111111-2222-3333-4444-555555555555';
const EJEMPLO = readFileSync(resolve(import.meta.dirname, '../../public/datos/centros-ejemplo.xlsx'));
const DESCARGA = 'https://jaicoscorp.sharepoint.com/descarga-temporal?token=x';

const CONFIG = {
  modo: 'microsoft',
  microsoft: { clientId: GUID, tenantId: GUID, dominiosPermitidos: ['aic.pe'] },
  datos: { fuente: 'graph', driveId: 'b!drive', itemId: 'ITEM1' },
  autoActualizarMinutos: 0,
};

/** fetch de mentira que cuenta cada pedido: config.json, Graph (metadatos) y la descarga del Excel. */
function simularRed() {
  const pedidos = { config: 0, graph: 0, descarga: 0, otros: [] as string[] };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.endsWith('config.json')) {
        pedidos.config++;
        return Response.json(CONFIG);
      }
      if (url.startsWith('https://graph.microsoft.com/v1.0/drives/b!drive/items/ITEM1')) {
        pedidos.graph++;
        return Response.json({
          id: 'ITEM1',
          name: 'centros-negocio-aic.xlsx',
          eTag: '"v1"',
          lastModifiedDateTime: '2026-10-08T21:45:00Z',
          parentReference: { driveId: 'b!drive' },
          '@microsoft.graph.downloadUrl': DESCARGA,
        });
      }
      if (url === DESCARGA) {
        pedidos.descarga++;
        return new Response(new Uint8Array(EJEMPLO));
      }
      pedidos.otros.push(url);
      return new Response('', { status: 404 });
    }),
  );
  return pedidos;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('<StrictMode>: los efectos dobles de React no repiten el inicio de sesión ni la descarga', () => {
  it('modo microsoft + Excel por Graph: una sola vez cada paso', async () => {
    const pedidos = simularRed();
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    await waitFor(() => expect(document.getElementById('contador')?.textContent).toBe('Mostrando 1–50 de 80 resultados (de 80 en total)'));
    expect(screen.getByText('persona@aic.pe')).toBeTruthy(); // entró con la cuenta de la empresa

    expect(msal.crear).toHaveBeenCalledTimes(1); // MSAL se prepara una vez
    expect(msal.pca.handleRedirectPromise).toHaveBeenCalledTimes(1); // la vuelta de Microsoft se procesa una vez
    expect(msal.pca.acquireTokenSilent).toHaveBeenCalledTimes(1); // un solo token para leer el Excel
    expect(pedidos).toEqual({ config: 1, graph: 1, descarga: 1, otros: [] });
  });
});
