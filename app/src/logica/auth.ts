// =============================================================================
// auth.ts — Inicio de sesión con Microsoft (MSAL = Microsoft Authentication Library).
//
// Flujo (con "redirección", el más compatible):
//   1. El usuario pulsa "Iniciar sesión con Microsoft" -> la página va a login.microsoftonline.com
//   2. Microsoft lo devuelve a redirect.html, que le pasa la respuesta a la app y la vuelve a abrir en la
//      MISMA dirección desde donde se pulsó el botón (ruta + query, ej. /centros/A2338PY01?q=cableado).
//   3. handleRedirectPromise() procesa esa respuesta y deja la cuenta guardada.
//   4. Para leer el Excel se pide un "token de acceso" con acquireTokenSilent()
//      (sin molestar al usuario); si ya no se puede en silencio, se redirige otra vez.
//
// El inicio de sesión pide solo el permiso básico (User.Read). Files.Read.All (leer el Excel) se pide
// recién en el paso 4: así, si la empresa exige que un administrador lo apruebe y todavía no lo hizo,
// la persona igual puede entrar y la app le explica qué falta (en vez de quedarse en la página de Microsoft).
//
// Este archivo solo se carga en modo "microsoft" (en modo demo no se descarga): hooks/useArranque.ts
// lo importa con import() dinámico.
//
// Por qué no se usa @azure/msal-react: su <MsalProvider> procesa la vuelta de Microsoft por su cuenta,
// mientras que aquí hace falta (a) explicar en español el error con el que vuelve Microsoft, (b) revisar
// dominio y tenant ANTES de dar por iniciada la sesión (y borrar la sesión local si no corresponde),
// (c) evitar bucles de redirección y (d) no cargar MSAL en modo demo. Eso es lo que hace este módulo,
// que además se prueba sin navegador (tests/unit/auth.test.ts).
// =============================================================================

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

/** Lo que se usa del almacenamiento del navegador (sessionStorage o uno de mentira en las pruebas). */
type AlmacenReintento = Pick<Storage, 'getItem' | 'setItem'>;

/** Evita bucles de redirección: solo una redirección "automática" cada 2 minutos. */
function puedeRedirigirDeNuevo(almacen: AlmacenReintento | null): boolean {
  try {
    const ultima = Number(almacen?.getItem(CLAVE_REINTENTO) || 0);
    if (Date.now() - ultima < ESPERA_REINTENTO_MS) return false;
    almacen?.setItem(CLAVE_REINTENTO, String(Date.now()));
  } catch {
    /* sin acceso al almacenamiento: se permite */
  }
  return true;
}

/** Permisos "básicos" (iniciar sesión y ver el nombre): los únicos que se piden al iniciar sesión. */
const PERMISOS_BASICOS = ['user.read', 'openid', 'profile', 'email', 'offline_access'];

/** De la lista de permisos de config.json, los que se piden al iniciar sesión (ej. ["User.Read"]). */
export function permisosDeInicio(scopes: readonly string[] | null | undefined): string[] {
  return (scopes || []).filter((s) => PERMISOS_BASICOS.includes(String(s).trim().toLowerCase()));
}

const requiereInteraccion = (e: unknown): boolean =>
  e instanceof InteractionRequiredAuthError || (e as { name?: unknown } | null)?.name === 'InteractionRequiredAuthError';

/** Lo que la app usa de MSAL (en las pruebas se reemplaza por uno de mentira). */
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

/** Dependencias que se pueden reemplazar en las pruebas. */
export interface DependenciasAuth {
  ubicacion?: { href: string };
  /** Carpeta donde está publicada la app ("/" por defecto: "base" de vite.config.ts). */
  base?: string;
  crearPca?: (configuracion: Configuration) => Promise<PcaMinima>;
  almacen?: AlmacenReintento | null;
}

export type EstadoSesion = 'sin-sesion' | 'permitido' | 'denegado';

/** Sesión de Microsoft, tal como la usa la pantalla. */
export interface Sesion {
  estado: EstadoSesion;
  cuenta: AccountInfo | null;
  nombre: string;
  correo: string;
  /** Por qué no puede entrar (estado "denegado"). */
  motivo: string;
  /** Error con el que volvió de Microsoft, ya explicado en español ('' si no hubo). */
  errorLogin: string;
  /**
   * Lleva al usuario a la página de Microsoft para iniciar sesión.
   * todosLosPermisos=true pide también Files.Read.All (botón "Volver a iniciar sesión" cuando faltaba aprobarlo).
   */
  iniciarSesion(opciones?: { todosLosPermisos?: boolean }): Promise<void>;
  /** Cierra la sesión en esta app y en Microsoft. */
  cerrarSesion(): Promise<void>;
  /**
   * Token de acceso para Microsoft Graph.
   * interactivo=false (auto-actualización): si hace falta volver a iniciar sesión, NO redirige; lanza error.
   */
  obtenerToken(opciones?: { interactivo?: boolean }): Promise<string>;
}

/** sessionStorage del navegador (o null si no hay o está bloqueado). */
function almacenPorDefecto(): AlmacenReintento | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Prepara MSAL y revisa si ya hay una sesión.
 *
 * @param ms  config.microsoft
 * @param dep  dependencias (para pruebas): { ubicacion, crearPca, almacen }
 */
export async function iniciarMicrosoft(ms: ConfigMicrosoft, dep: DependenciasAuth = {}): Promise<Sesion> {
  const ubicacion = dep.ubicacion || globalThis.location;
  const crearPca = dep.crearPca || createStandardPublicClientApplication;
  const almacen = dep.almacen !== undefined ? dep.almacen : almacenPorDefecto();

  // Dirección de la app: su carpeta (no la ruta actual). Si se inicia sesión desde /centros/A2338PY01, la
  // página puente sigue siendo <app>/redirect.html (la registrada en Entra ID), no /centros/redirect.html.
  // A qué ruta se vuelve después lo recuerda MSAL: la dirección completa desde donde se pulsó el botón.
  const base = new URL(dep.base ?? BASE_APP, ubicacion.href);
  const scopes = ms.scopes; // todos: se piden al leer el Excel
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
          return new Promise<string>(() => {}); // la página se va a Microsoft; no se continúa
        }
        // Falta aprobar un permiso (ej. se agregó Files.Read.All): lo tiene que aprobar un administrador.
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
      // Se borra la sesión guardada en este navegador para no usar sus tokens.
      try {
        await pca.clearCache({ account: cuenta });
      } catch (e) {
        console.warn('No se pudo limpiar la sesión local:', e);
      }
    }
  }
  return sesion;
}
