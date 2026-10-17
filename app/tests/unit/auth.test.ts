import { describe, expect, it, vi } from 'vitest';
import type { ConfigMicrosoft } from '../../src/logica/config.ts';
import type { PcaMinima } from '../../src/logica/auth.ts';

vi.mock('@azure/msal-browser', () => {
  class InteractionRequiredAuthError extends Error {
    constructor(mensaje?: string) {
      super(mensaje);
      this.name = 'InteractionRequiredAuthError';
    }
  }
  return { InteractionRequiredAuthError, createStandardPublicClientApplication: vi.fn() };
});

const { InteractionRequiredAuthError } = (await import('@azure/msal-browser')) as unknown as {
  InteractionRequiredAuthError: new (mensaje: string) => Error;
};
const { iniciarMicrosoft, permisosDeInicio } = await import('../../src/logica/auth.ts');

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000001';
const MS: ConfigMicrosoft = {
  clientId: '11111111-2222-3333-4444-555555555555',
  tenantId: TENANT,
  dominiosPermitidos: ['aic.pe', 'jaicoscorp.com'],
  tenantsPermitidos: [],
  scopes: ['User.Read', 'Files.Read.All'],
  guardarSesion: 'localStorage',
  redirectUri: '',
  postLogoutRedirectUri: '',
};
const UBICACION = { href: 'https://buscador.ejemplo.test/app/centros/A2338PY01?q=x' };
const BASE = '/app/';

const cuenta = (correo: string) => ({
  username: correo,
  name: 'Persona Demo',
  tenantId: TENANT,
  homeAccountId: `${correo}.${TENANT}`,
  environment: 'login.microsoftonline.com',
  localAccountId: correo,
  idTokenClaims: { preferred_username: correo, tid: TENANT },
});
type Cuenta = ReturnType<typeof cuenta>;

function pcaFalso({
  resultado = null,
  cuentas = [],
  activa = null,
  errorRedirect = null,
}: { resultado?: { account: Cuenta } | null; cuentas?: Cuenta[]; activa?: Cuenta | null; errorRedirect?: Error | null } = {}) {
  return {
    handleRedirectPromise: vi.fn(async () => {
      if (errorRedirect) throw errorRedirect;
      return resultado;
    }),
    getAllAccounts: vi.fn(() => cuentas),
    getActiveAccount: vi.fn(() => activa),
    setActiveAccount: vi.fn(),
    clearCache: vi.fn(async (_opciones?: unknown) => {}),
    loginRedirect: vi.fn(async (_pedido?: unknown) => {}),
    logoutRedirect: vi.fn(async (_pedido?: unknown) => {}),
    acquireTokenSilent: vi.fn(async (_pedido?: unknown): Promise<{ accessToken: string }> => ({ accessToken: 'TOKEN' })),
    acquireTokenRedirect: vi.fn(async (_pedido?: unknown) => {}),
  };
}
type PcaFalso = ReturnType<typeof pcaFalso>;

const comoPca = (pca: PcaFalso) => pca as unknown as PcaMinima;

function almacenFalso() {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, String(v)) };
}

async function iniciar(pca: PcaFalso, { ubicacion = UBICACION, base = BASE }: { ubicacion?: { href: string }; base?: string } = {}) {
  const crearPca = vi.fn(async (_config: unknown) => comoPca(pca));
  const sesion = await iniciarMicrosoft(MS, { ubicacion, base, crearPca, almacen: almacenFalso() });
  return { sesion, crearPca };
}

describe('iniciarMicrosoft', () => {
  it('configura MSAL con el tenant, redirect.html y la sesión en localStorage', async () => {
    const { crearPca } = await iniciar(pcaFalso());
    const config = crearPca.mock.calls[0][0] as { auth: unknown; cache: { cacheLocation: string } };
    expect(config.auth).toEqual({
      clientId: MS.clientId,
      authority: `https://login.microsoftonline.com/${TENANT}`,
      redirectUri: 'https://buscador.ejemplo.test/app/redirect.html',
      postLogoutRedirectUri: 'https://buscador.ejemplo.test/app/',
    });
    expect(config.cache.cacheLocation).toBe('localStorage');
  });

  it('desde una ruta anidada (/centros/A2338PY01?q=x) la página puente sigue siendo <raíz de la app>/redirect.html', async () => {
    const { crearPca } = await iniciar(pcaFalso(), { ubicacion: { href: 'https://aic-centros-negocio.example/centros/A2338PY01?q=x' }, base: '/' });
    const config = crearPca.mock.calls[0][0] as { auth: { redirectUri: string; postLogoutRedirectUri: string } };
    expect(config.auth.redirectUri).toBe('https://aic-centros-negocio.example/redirect.html');
    expect(config.auth.postLogoutRedirectUri).toBe('https://aic-centros-negocio.example/');
  });

  it('sin cuenta: pide iniciar sesión con selección de cuenta y SOLO el permiso básico (User.Read)', async () => {
    const pca = pcaFalso();
    const { sesion } = await iniciar(pca);
    expect(sesion.estado).toBe('sin-sesion');
    await sesion.iniciarSesion();
    expect(pca.loginRedirect).toHaveBeenCalledWith({ scopes: ['User.Read'], prompt: 'select_account' });
    await sesion.iniciarSesion({ todosLosPermisos: true });
    expect(pca.loginRedirect).toHaveBeenLastCalledWith({ scopes: MS.scopes, prompt: 'select_account' });
  });

  it('permisosDeInicio: solo los básicos de la lista de config.json', () => {
    expect(permisosDeInicio(['User.Read', 'Files.Read.All'])).toEqual(['User.Read']);
    expect(permisosDeInicio(['user.read', 'Sites.Read.All', 'openid'])).toEqual(['user.read', 'openid']);
    expect(permisosDeInicio(['Files.Read.All'])).toEqual([]);
    expect(permisosDeInicio(undefined)).toEqual([]);
  });

  it('cuenta de la empresa: entra y obtiene token en silencio', async () => {
    const c = cuenta('ana@aic.pe');
    const pca = pcaFalso({ resultado: { account: c }, cuentas: [c] });
    const { sesion } = await iniciar(pca);
    expect(sesion.estado).toBe('permitido');
    expect(sesion.correo).toBe('ana@aic.pe');
    expect(pca.setActiveAccount).toHaveBeenCalledWith(c);
    expect(await sesion.obtenerToken()).toBe('TOKEN');
    expect(pca.acquireTokenSilent).toHaveBeenCalledWith({ scopes: MS.scopes, account: c });
  });

  it('cuenta de otro dominio: sin acceso, se borra la sesión local y se puede cerrar sesión', async () => {
    const c = cuenta('alguien@gmail.com');
    const pca = pcaFalso({ resultado: { account: c }, cuentas: [c] });
    const { sesion } = await iniciar(pca);
    expect(sesion.estado).toBe('denegado');
    expect(sesion.motivo).toMatch(/solo para cuentas de la empresa/);
    expect(pca.clearCache).toHaveBeenCalledWith({ account: c });
    expect(pca.setActiveAccount).not.toHaveBeenCalled();
    await expect(sesion.obtenerToken()).rejects.toMatchObject({ tipo: 'sesion' });
    await sesion.cerrarSesion();
    expect(pca.logoutRedirect).toHaveBeenCalledWith({ account: c });
  });

  it('con varias cuentas guardadas elige la que tiene acceso', async () => {
    const mala = cuenta('x@gmail.com');
    const buena = cuenta('luis@jaicoscorp.com');
    const { sesion } = await iniciar(pcaFalso({ cuentas: [mala, buena] }));
    expect(sesion.estado).toBe('permitido');
    expect(sesion.correo).toBe('luis@jaicoscorp.com');
  });

  it('si hace falta volver a iniciar sesión: redirige una vez y no entra en bucle', async () => {
    const c = cuenta('ana@aic.pe');
    const pca = pcaFalso({ cuentas: [c] });
    pca.acquireTokenSilent.mockRejectedValue(new InteractionRequiredAuthError('login_required'));
    const { sesion } = await iniciar(pca);

    await expect(sesion.obtenerToken({ interactivo: false })).rejects.toMatchObject({ tipo: 'sesion' });
    expect(pca.acquireTokenRedirect).not.toHaveBeenCalled();

    const pendiente = sesion.obtenerToken({ interactivo: true });
    await vi.waitFor(() => expect(pca.acquireTokenRedirect).toHaveBeenCalledTimes(1));
    void pendiente;

    await expect(sesion.obtenerToken({ interactivo: true })).rejects.toMatchObject({ tipo: 'sesion' });
    expect(pca.acquireTokenRedirect).toHaveBeenCalledTimes(1);
  });

  it('falta el consentimiento de un administrador: error "consentimiento" con el paso a seguir', async () => {
    const c = cuenta('ana@aic.pe');
    const pca = pcaFalso({ cuentas: [c] });
    const error = Object.assign(new InteractionRequiredAuthError('AADSTS65001: The user or administrator has not consented'), {
      errorCode: 'consent_required',
    });
    pca.acquireTokenSilent.mockRejectedValue(error);
    const { sesion } = await iniciar(pca);
    const e = (await sesion.obtenerToken({ interactivo: false }).catch((x: unknown) => x)) as Error;
    expect(e).toMatchObject({ tipo: 'consentimiento' });
    expect(e.message).toMatch(/Conceder consentimiento de administrador/);
    expect(pca.acquireTokenRedirect).not.toHaveBeenCalled();
  });

  it('volver de Microsoft con "se necesita aprobación del administrador": mensaje claro', async () => {
    const error = Object.assign(new Error('AADSTS90094: The grant requires admin permission.'), { errorCode: 'access_denied' });
    const { sesion } = await iniciar(pcaFalso({ errorRedirect: error }));
    expect(sesion.estado).toBe('sin-sesion');
    expect(sesion.errorLogin).toMatch(/un administrador apruebe el permiso de lectura de archivos/);
  });

  it('ya había entrado (solo User.Read) y falta aprobar Files.Read.All: la sesión sigue y se explica qué falta', async () => {
    const c = cuenta('ana@aic.pe');
    const error = Object.assign(new Error('AADSTS90093: An administrator has set a policy that prevents you'), {
      errorCode: 'access_denied',
    });
    const pca = pcaFalso({ cuentas: [c], errorRedirect: error });
    pca.acquireTokenSilent.mockRejectedValue(
      Object.assign(new InteractionRequiredAuthError('AADSTS65001: The user or administrator has not consented'), {
        errorCode: 'invalid_grant',
      }),
    );
    const almacen = almacenFalso();
    almacen.setItem('buscador-cn.reintento-token', String(Date.now()));
    const sesion = await iniciarMicrosoft(MS, { ubicacion: UBICACION, crearPca: async () => comoPca(pca), almacen });
    expect(sesion.estado).toBe('permitido');
    expect(sesion.errorLogin).toMatch(/un administrador apruebe el permiso de lectura de archivos.*\(AADSTS90093\)/s);
    const e = await sesion.obtenerToken({ interactivo: true }).catch((x: unknown) => x);
    expect(e).toMatchObject({ tipo: 'consentimiento' });
    expect(pca.acquireTokenSilent).toHaveBeenCalledWith({ scopes: MS.scopes, account: c });
    expect(pca.acquireTokenRedirect).not.toHaveBeenCalled();
  });

  it('error al volver de Microsoft: se explica en español', async () => {
    const error = Object.assign(new Error('AADSTS50105: user not assigned'), { errorCode: 'access_denied' });
    const { sesion } = await iniciar(pcaFalso({ errorRedirect: error }));
    expect(sesion.estado).toBe('sin-sesion');
    expect(sesion.errorLogin).toMatch(/no está asignado/);
  });
});
