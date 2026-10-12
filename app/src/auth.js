// =============================================================================
// auth.js — Inicio de sesión con Microsoft (MSAL = Microsoft Authentication Library).
//
// Flujo (con "redirección", el más compatible):
//   1. El usuario pulsa "Iniciar sesión con Microsoft" -> la página va a login.microsoftonline.com
//   2. Microsoft lo devuelve a redirect.html, que le pasa la respuesta a la app.
//   3. handleRedirectPromise() procesa esa respuesta y deja la cuenta guardada.
//   4. Para leer el Excel se pide un "token de acceso" con acquireTokenSilent()
//      (sin molestar al usuario); si ya no se puede en silencio, se redirige otra vez.
//
// El inicio de sesión pide solo el permiso básico (User.Read). Files.Read.All (leer el Excel) se pide
// recién en el paso 4: así, si la empresa exige que un administrador lo apruebe y todavía no lo hizo,
// la persona igual puede entrar y la app le explica qué falta (en vez de quedarse en la página de Microsoft).
//
// Este archivo solo se carga en modo "microsoft" (en modo demo no se descarga).
// =============================================================================

import { createStandardPublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import { construirAuthority, esErrorConsentimiento, explicarErrorLogin, verificarAcceso } from './acceso.js';
import { ErrorDatos } from './graph.js';

const CLAVE_REINTENTO = 'buscador-cn.reintento-token';
const ESPERA_REINTENTO_MS = 2 * 60 * 1000;

/** Evita bucles de redirección: solo una redirección "automática" cada 2 minutos. */
function puedeRedirigirDeNuevo(almacen) {
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
export function permisosDeInicio(scopes) {
  return (scopes || []).filter((s) => PERMISOS_BASICOS.includes(String(s).trim().toLowerCase()));
}

const requiereInteraccion = (e) =>
  e instanceof InteractionRequiredAuthError || e?.name === 'InteractionRequiredAuthError';

/**
 * Prepara MSAL y revisa si ya hay una sesión.
 *
 * @param {object} ms  config.microsoft
 * @param {object} [dep]  dependencias (para pruebas): { ubicacion, crearPca, almacen }
 * @returns {Promise<object>} sesión: { estado: 'sin-sesion'|'permitido'|'denegado', cuenta, nombre, correo,
 *   motivo, errorLogin, iniciarSesion(), cerrarSesion(), obtenerToken({ interactivo }) }
 */
export async function iniciarMicrosoft(ms, dep = {}) {
  const ubicacion = dep.ubicacion || globalThis.location;
  const crearPca = dep.crearPca || createStandardPublicClientApplication;
  const almacen = dep.almacen !== undefined ? dep.almacen : globalThis.sessionStorage;

  const base = new URL('./', ubicacion.href);
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

  let resultado = null;
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
    resultado?.account ||
    pca.getActiveAccount() ||
    cuentas.find((c) => verificarAcceso(c, reglas).permitido) ||
    cuentas[0] ||
    null;

  const sesion = {
    estado: 'sin-sesion',
    cuenta: null,
    nombre: '',
    correo: '',
    motivo: '',
    errorLogin,

    /**
     * Lleva al usuario a la página de Microsoft para iniciar sesión.
     * todosLosPermisos=true pide también Files.Read.All (botón "Volver a iniciar sesión" cuando faltaba aprobarlo).
     */
    iniciarSesion: ({ todosLosPermisos = false } = {}) =>
      pca.loginRedirect({ scopes: todosLosPermisos ? scopes : scopesInicio, prompt: 'select_account' }),

    /** Cierra la sesión en esta app y en Microsoft. */
    cerrarSesion: () => pca.logoutRedirect({ account: sesion.cuenta || cuenta || undefined }),

    /**
     * Token de acceso para Microsoft Graph.
     * interactivo=false (auto-actualización): si hace falta volver a iniciar sesión, NO redirige; lanza error.
     */
    obtenerToken: async ({ interactivo = true } = {}) => {
      if (!sesion.cuenta) throw new ErrorDatos('sesion', 'No hay una sesión iniciada.');
      try {
        const r = await pca.acquireTokenSilent({ scopes, account: sesion.cuenta });
        return r.accessToken;
      } catch (e) {
        console.warn('No se pudo obtener el token en silencio:', e);
        if (requiereInteraccion(e) && interactivo && puedeRedirigirDeNuevo(almacen)) {
          await pca.acquireTokenRedirect({ scopes, account: sesion.cuenta });
          return new Promise(() => {}); // la página se va a Microsoft; no se continúa
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
