// =============================================================================
// acceso.ts — Reglas de "quién puede entrar" (funciones puras, sin MSAL).
//
// IMPORTANTE: este chequeo corre en el navegador del usuario, así que es solo
// una capa de comodidad (muestra un mensaje claro). La seguridad de verdad está en:
//   1) El registro de la app en Entra ID (solo cuentas del tenant de la empresa).
//   2) "Asignación de usuario requerida" (opcional) en la aplicación empresarial.
//   3) Los permisos del propio Excel en SharePoint: con permisos delegados,
//      cada usuario solo puede leer lo que ya tiene compartido.
// Ver GUIA-CONFIGURACION-MICROSOFT.md.
// =============================================================================

/** Lo que se usa de una cuenta de MSAL (AccountInfo) para decidir si puede entrar. */
export interface CuentaLogin {
  username?: string;
  name?: string;
  tenantId?: string;
  idTokenClaims?: { [clave: string]: unknown };
}

/** Resultado de revisar una cuenta. */
export interface ResultadoAcceso {
  permitido: boolean;
  correo: string;
  motivo: string;
}

/** Reglas de config.json (sección "microsoft"). */
export interface ReglasAcceso {
  dominiosPermitidos?: readonly string[] | null;
  tenantsPermitidos?: readonly string[] | null;
}

/**
 * Correo con el que entró la persona (lo que se compara con los dominios permitidos).
 * Se usa primero "preferred_username", que en Entra ID es el NOMBRE DE INICIO DE SESIÓN (UPN).
 * Normalmente es igual al correo (ana@aic.pe), pero si en la empresa el UPN fuera distinto
 * (ej. ana@aic.onmicrosoft.com) habría que agregar ese dominio a dominiosPermitidos (por confirmar).
 * No se usa el claim "email" para dar acceso porque no siempre está verificado por Microsoft.
 */
export function correoDeCuenta(cuenta: CuentaLogin | null | undefined): string {
  if (!cuenta) return '';
  const c = cuenta.idTokenClaims || {};
  const candidatos: unknown[] = [c.preferred_username, c.email, c.upn, cuenta.username];
  const correo = candidatos.find((v): v is string => typeof v === 'string' && v.includes('@'));
  return (correo || '').trim().toLowerCase();
}

/** Dominio del correo: "ana@aic.pe" -> "aic.pe" */
export function dominioDeCorreo(correo: unknown): string {
  const s = String(correo || '')
    .trim()
    .toLowerCase();
  const i = s.lastIndexOf('@');
  return i === -1 ? '' : s.slice(i + 1);
}

/** Tenant (directorio de Microsoft 365) con el que se emitió el token. */
export function tenantDeCuenta(cuenta: CuentaLogin | null | undefined): string {
  return String(cuenta?.idTokenClaims?.tid || cuenta?.tenantId || '').toLowerCase();
}

/** ¿Esta cuenta puede usar la app? */
export function verificarAcceso(
  cuenta: CuentaLogin | null | undefined,
  { dominiosPermitidos = [], tenantsPermitidos = [] }: ReglasAcceso = {},
): ResultadoAcceso {
  const correo = correoDeCuenta(cuenta);
  if (!cuenta) return { permitido: false, correo, motivo: 'No hay una sesión iniciada.' };

  const tenants = (tenantsPermitidos || []).map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  if (tenants.length > 0 && !tenants.includes(tenantDeCuenta(cuenta))) {
    return {
      permitido: false,
      correo,
      motivo: 'Tu cuenta pertenece a una organización de Microsoft 365 que no está autorizada para esta aplicación.',
    };
  }

  const dominios = (dominiosPermitidos || [])
    .map((d) =>
      String(d)
        .trim()
        .toLowerCase()
        .replace(/^@/, ''),
    )
    .filter(Boolean);
  if (dominios.length > 0) {
    const dominio = dominioDeCorreo(correo);
    if (!dominio || !dominios.includes(dominio)) {
      return {
        permitido: false,
        correo,
        motivo: `Esta aplicación es solo para cuentas de la empresa (${dominios.map((d) => '@' + d).join(' o ')}).`,
      };
    }
  }
  return { permitido: true, correo, motivo: '' };
}

/**
 * Autoridad de inicio de sesión: el tenant de la empresa (lo normal; config.ts lo exige).
 * "organizations" (cualquier cuenta de trabajo) solo si se configuró así a propósito.
 */
export function construirAuthority(ms: { tenantId?: string } = {}): string {
  const tenant = String(ms.tenantId || '').trim();
  return `https://login.microsoftonline.com/${tenant || 'organizations'}`;
}

/**
 * Mensaje cuando la organización exige que un administrador apruebe los permisos de la app
 * (pasa con Files.Read.All si en Entra ID los usuarios no pueden aprobar permisos por su cuenta).
 * "Conceder consentimiento de administrador" solo aprueba los permisos que YA están en la lista de
 * "Permisos de API" de la app: por eso se pide revisar primero que Files.Read.All esté ahí.
 */
export const MENSAJE_CONSENTIMIENTO =
  'Tu organización exige que un administrador apruebe el permiso de lectura de archivos (Files.Read.All) para la app ' +
  '"Buscador de centros de negocio". Pídeselo a quien administra Microsoft 365: Entra ID → Registros de aplicaciones → ' +
  'Buscador de centros de negocio → Permisos de API. Ahí debe revisar que "Files.Read.All" (delegado) esté en la lista ' +
  '(si no está: "+ Agregar un permiso", guía paso 2) y luego pulsar "Conceder consentimiento de administrador". ' +
  'Después vuelve a iniciar sesión.';

/**
 * Códigos de Entra ID que significan "falta que un administrador apruebe (consienta) los permisos de la app".
 *   AADSTS65001: nadie aprobó todavía los permisos · AADSTS90093: una directiva impide que el usuario los apruebe
 *   AADSTS90094 / AADSTS90095: solo un administrador puede aprobarlos · AADSTS900941: app "riesgosa", solo un administrador
 */
const CODIGOS_CONSENTIMIENTO = ['AADSTS65001', 'AADSTS90093', 'AADSTS90094', 'AADSTS90095', 'AADSTS900941'];

/** Lo que se lee de un error de MSAL (o de cualquier error). */
interface ErrorConCodigo {
  errorCode?: unknown;
  errorMessage?: unknown;
  message?: unknown;
}

const textoDeError = (error: unknown): string => {
  const e: ErrorConCodigo = typeof error === 'object' && error !== null ? error : {};
  return `${e.errorCode || ''} ${e.errorMessage || e.message || ''}`;
};

/** Códigos AADSTS que trae el error, completos ("AADSTS900941" no se confunde con "AADSTS90094"). */
const codigosDeError = (error: unknown): string[] => textoDeError(error).match(/AADSTS\d+/g) || [];

/** ¿El error de MSAL dice que falta aprobar los permisos (consentimiento)? */
export function esErrorConsentimiento(error: unknown): boolean {
  return (
    codigosDeError(error).some((c) => CODIGOS_CONSENTIMIENTO.includes(c)) ||
    /consent_required|admin(istrator)?[\s_-]*(approval|consent)/i.test(textoDeError(error))
  );
}

/** Explica en español los errores más comunes de Entra ID (códigos AADSTS). */
export function explicarErrorLogin(error: unknown): string {
  const texto = textoDeError(error);
  const codigosEnError = codigosDeError(error);
  if (esErrorConsentimiento(error)) {
    const codigo = codigosEnError.find((c) => CODIGOS_CONSENTIMIENTO.includes(c)) || 'consent_required';
    return `${MENSAJE_CONSENTIMIENTO} (${codigo})`;
  }
  const codigos: Record<string, string> = {
    AADSTS50105: 'Tu usuario no está asignado a esta aplicación. Pide acceso al administrador de Microsoft 365.',
    AADSTS50020: 'Tu cuenta es de otra organización que no está habilitada para esta aplicación.',
    // Llega también cuando la persona PIDIÓ la aprobación al administrador y pulsó "Volver a la aplicación"
    // (flujo de "solicitud de consentimiento de administrador" de Entra ID).
    AADSTS65004:
      'No se aprobaron los permisos de la app. Si pediste la aprobación de un administrador, espera a que la conceda ' +
      '(Entra ID → Registros de aplicaciones → Buscador de centros de negocio → Permisos de API → "Conceder ' +
      'consentimiento de administrador") y vuelve a iniciar sesión. Si cancelaste tú, vuelve a iniciar sesión y ' +
      'acepta los permisos (son solo de lectura).',
    AADSTS50011: 'La dirección de retorno (redirect URI) no está registrada en Entra ID. Revisa la guía de configuración.',
    AADSTS700016: 'El Id. de aplicación (clientId) no existe en este directorio. Revisa config.json.',
    AADSTS90002: 'El Id. de directorio (tenantId) no es válido. Revisa config.json.',
    AADSTS50194: 'La app está registrada para un solo directorio (inquilino único): completa "microsoft.tenantId" en config.json.',
    AADSTS9002326: 'La app debe registrarse como "Aplicación de página única (SPA)" en Entra ID.',
  };
  for (const [codigo, mensaje] of Object.entries(codigos)) {
    if (codigosEnError.includes(codigo)) return `${mensaje} (${codigo})`;
  }
  if (/user_cancelled|access_denied/i.test(texto)) return 'Se canceló el inicio de sesión.';
  return 'No se pudo iniciar sesión con Microsoft. Vuelve a intentarlo; si sigue fallando, avisa al administrador.';
}
