import {
  createStandardPublicClientApplication,
  InteractionRequiredAuthError,
  type AccountInfo,
  type Configuration,
  type IPublicClientApplication,
} from '@azure/msal-browser';
import { construirAuthority, esErrorConsentimiento, explicarErrorLogin, verificarAcceso } from './acceso.ts';
import type { ConfigMicrosoft } from './config.ts';
import { ErrorDatos } from './graph.ts';
import { BASE_APP } from './rutas.ts';

const CLAVE_REINTENTO = 'buscador-cn.reintento-token';
const ESPERA_REINTENTO_MS = 2 * 60 * 1000;

type AlmacenReintento = Pick<Storage, 'getItem' | 'setItem'>;

function puedeRedirigirDeNuevo(almacen: AlmacenReintento | null): boolean {
  try {
    const ultima = Number(almacen?.getItem(CLAVE_REINTENTO) || 0);
    if (Date.now() - ultima < ESPERA_REINTENTO_MS) return false;
    almacen?.setItem(CLAVE_REINTENTO, String(Date.now()));
  } catch {
  }
  return true;
}

const PERMISOS_BASICOS = ['user.read', 'openid', 'profile', 'email', 'offline_access'];

export function permisosDeInicio(scopes: readonly string[] | null | undefined): string[] {
  return (scopes || []).filter((s) => PERMISOS_BASICOS.includes(String(s).trim().toLowerCase()));
}

const requiereInteraccion = (e: unknown): boolean =>
  e instanceof InteractionRequiredAuthError || (e as { name?: unknown } | null)?.name === 'InteractionRequiredAuthError';

export type PcaMinima = Pick<
  IPublicClientApplication,
  | 'handleRedirectPromise'
  | 'getAllAccounts'
  | 'getActiveAccount'
  | 'setActiveAccount'
  | 'clearCache'
  | 'loginRedirect'
  | 'logoutRedirect'
  | 'acquireTokenSilent'
  | 'acquireTokenRedirect'
>;

export interface DependenciasAuth {
  ubicacion?: { href: string };
  base?: string;
  crearPca?: (configuracion: Configuration) => Promise<PcaMinima>;
  almacen?: AlmacenReintento | null;
}

export type EstadoSesion = 'sin-sesion' | 'permitido' | 'denegado';

export interface Sesion {
  estado: EstadoSesion;
  cuenta: AccountInfo | null;
  nombre: string;
  correo: string;
  motivo: string;
  errorLogin: string;
  iniciarSesion(opciones?: { todosLosPermisos?: boolean }): Promise<void>;
  cerrarSesion(): Promise<void>;
  obtenerToken(opciones?: { interactivo?: boolean }): Promise<string>;
}

function almacenPorDefecto(): AlmacenReintento | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

export async function iniciarMicrosoft(ms: ConfigMicrosoft, dep: DependenciasAuth = {}): Promise<Sesion> {
  const ubicacion = dep.ubicacion || globalThis.location;
  const crearPca = dep.crearPca || createStandardPublicClientApplication;
  const almacen = dep.almacen !== undefined ? dep.almacen : almacenPorDefecto();

  const base = new URL(dep.base ?? BASE_APP, ubicacion.href);
  const scopes = ms.scopes;
  const scopesInicio = permisosDeInicio(scopes);
  const pca = await crearPca({
    auth: {
      clientId: String(ms.clientId).trim(),
      authority: construirAuthority(ms),
      redirectUri: ms.redirectUri || new URL('redirect.html', base).href,
      postLogoutRedirectUri: ms.postLogoutRedirectUri || base.href,
    },
    cache: {
      cacheLocation: ms.guardarSesion === 'sessionStorage' ? 'sessionStorage' : 'localStorage',
    },
  });

  let resultado: Awaited<ReturnType<PcaMinima['handleRedirectPromise']>> = null;
  let errorLogin = '';
  try {
    resultado = await pca.handleRedirectPromise();
  } catch (e) {
    console.error('Error al volver de Microsoft:', e);
    errorLogin = explicarErrorLogin(e);
  }

  const reglas = { dominiosPermitidos: ms.dominiosPermitidos, tenantsPermitidos: ms.tenantsPermitidos };
  const cuentas = pca.getAllAccounts();
  const cuenta =
    resultado?.account || pca.getActiveAccount() || cuentas.find((c) => verificarAcceso(c, reglas).permitido) || cuentas[0] || null;

  const sesion: Sesion = {
    estado: 'sin-sesion',
    cuenta: null,
    nombre: '',
    correo: '',
    motivo: '',
    errorLogin,

    iniciarSesion: ({ todosLosPermisos = false } = {}) =>
      pca.loginRedirect({ scopes: todosLosPermisos ? scopes : scopesInicio, prompt: 'select_account' }),

    cerrarSesion: () => pca.logoutRedirect({ account: sesion.cuenta || cuenta || undefined }),

    obtenerToken: async ({ interactivo = true } = {}) => {
      if (!sesion.cuenta) throw new ErrorDatos('sesion', 'No hay una sesión iniciada.');
      try {
        const r = await pca.acquireTokenSilent({ scopes, account: sesion.cuenta });
        return r.accessToken;
      } catch (e) {
        console.warn('No se pudo obtener el token en silencio:', e);
        if (requiereInteraccion(e) && interactivo && puedeRedirigirDeNuevo(almacen)) {
          await pca.acquireTokenRedirect({ scopes, account: sesion.cuenta });
          return new Promise<string>(() => {});
        }
        if (esErrorConsentimiento(e)) throw new ErrorDatos('consentimiento', explicarErrorLogin(e), e);
        if (requiereInteraccion(e)) {
          throw new ErrorDatos('sesion', 'Tu sesión de Microsoft venció. Pulsa "Actualizar" o vuelve a iniciar sesión.', e);
        }
        throw new ErrorDatos('sesion', explicarErrorLogin(e), e);
      }
    },
  };

  if (cuenta) {
    const acceso = verificarAcceso(cuenta, reglas);
    sesion.correo = acceso.correo;
    sesion.nombre = cuenta.name || acceso.correo;
    if (acceso.permitido) {
      pca.setActiveAccount(cuenta);
      sesion.estado = 'permitido';
      sesion.cuenta = cuenta;
    } else {
      sesion.estado = 'denegado';
      sesion.motivo = acceso.motivo;
      try {
        await pca.clearCache({ account: cuenta });
      } catch (e) {
        console.warn('No se pudo limpiar la sesión local:', e);
      }
    }
  }
  return sesion;
}
