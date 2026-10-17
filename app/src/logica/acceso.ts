export interface CuentaLogin {
  username?: string;
  name?: string;
  tenantId?: string;
  idTokenClaims?: { [clave: string]: unknown };
}

export interface ResultadoAcceso {
  permitido: boolean;
  correo: string;
  motivo: string;
}

export interface ReglasAcceso {
  dominiosPermitidos?: readonly string[] | null;
  tenantsPermitidos?: readonly string[] | null;
}

export function correoDeCuenta(cuenta: CuentaLogin | null | undefined): string {
  if (!cuenta) return '';
  const c = cuenta.idTokenClaims || {};
  const candidatos: unknown[] = [c.preferred_username, c.email, c.upn, cuenta.username];
  const correo = candidatos.find((v): v is string => typeof v === 'string' && v.includes('@'));
  return (correo || '').trim().toLowerCase();
}

export function dominioDeCorreo(correo: unknown): string {
  const s = String(correo || '')
    .trim()
    .toLowerCase();
  const i = s.lastIndexOf('@');
  return i === -1 ? '' : s.slice(i + 1);
}

export function tenantDeCuenta(cuenta: CuentaLogin | null | undefined): string {
  return String(cuenta?.idTokenClaims?.tid || cuenta?.tenantId || '').toLowerCase();
}

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

export function construirAuthority(ms: { tenantId?: string } = {}): string {
  const tenant = String(ms.tenantId || '').trim();
  return `https://login.microsoftonline.com/${tenant || 'organizations'}`;
}

export const NOMBRE_APP_ENTRA = 'Automatizacion de procesos Aaron';

export const MENSAJE_CONSENTIMIENTO =
  'Tu organización exige que un administrador apruebe el permiso de lectura de archivos (Files.Read.All) para la app ' +
  `"${NOMBRE_APP_ENTRA}". Pídeselo a quien administra Microsoft 365: Entra ID → Registros de aplicaciones → ` +
  `${NOMBRE_APP_ENTRA} → Permisos de API. Ahí debe revisar que "Files.Read.All" (delegado) esté en la lista ` +
  '(si no está: "+ Agregar un permiso", guía paso 2) y luego pulsar "Conceder consentimiento de administrador". ' +
  'Después vuelve a iniciar sesión.';

const CODIGOS_CONSENTIMIENTO = ['AADSTS65001', 'AADSTS90093', 'AADSTS90094', 'AADSTS90095', 'AADSTS900941'];

interface ErrorConCodigo {
  errorCode?: unknown;
  errorMessage?: unknown;
  message?: unknown;
}

const textoDeError = (error: unknown): string => {
  const e: ErrorConCodigo = typeof error === 'object' && error !== null ? error : {};
  return `${e.errorCode || ''} ${e.errorMessage || e.message || ''}`;
};

const codigosDeError = (error: unknown): string[] => textoDeError(error).match(/AADSTS\d+/g) || [];

export function esErrorConsentimiento(error: unknown): boolean {
  return (
    codigosDeError(error).some((c) => CODIGOS_CONSENTIMIENTO.includes(c)) ||
    /consent_required|admin(istrator)?[\s_-]*(approval|consent)/i.test(textoDeError(error))
  );
}

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
    AADSTS65004:
      'No se aprobaron los permisos de la app. Si pediste la aprobación de un administrador, espera a que la conceda ' +
      `(Entra ID → Registros de aplicaciones → ${NOMBRE_APP_ENTRA} → Permisos de API → "Conceder ` +
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
