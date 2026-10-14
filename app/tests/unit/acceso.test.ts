import { describe, expect, it } from 'vitest';
import {
  construirAuthority,
  correoDeCuenta,
  dominioDeCorreo,
  esErrorConsentimiento,
  explicarErrorLogin,
  verificarAcceso,
} from '../../src/logica/acceso.ts';

const TENANT_AIC = 'aaaaaaaa-0000-0000-0000-000000000001';
const TENANT_OTRO = 'bbbbbbbb-0000-0000-0000-000000000002';
const REGLAS = { dominiosPermitidos: ['aic.pe', '@JaicosCorp.com'], tenantsPermitidos: [] };

const cuenta = (correo: string, tid = TENANT_AIC, extra: Record<string, unknown> = {}) => ({
  username: correo,
  tenantId: tid,
  name: 'Persona Demo',
  idTokenClaims: { preferred_username: correo, tid, ...extra },
});

describe('correo y dominio', () => {
  it('usa preferred_username, luego email, luego upn', () => {
    expect(correoDeCuenta(cuenta('Ana@AIC.pe'))).toBe('ana@aic.pe');
    expect(correoDeCuenta({ username: '', idTokenClaims: { email: 'b@aic.pe' } })).toBe('b@aic.pe');
    expect(correoDeCuenta({ username: '', idTokenClaims: { upn: 'c@aic.pe' } })).toBe('c@aic.pe');
    expect(correoDeCuenta(null)).toBe('');
  });
  it('extrae el dominio', () => {
    expect(dominioDeCorreo('ana@aic.pe')).toBe('aic.pe');
    expect(dominioDeCorreo('sin-arroba')).toBe('');
  });
});

describe('verificarAcceso', () => {
  it('permite correos de los dominios configurados (sin importar mayúsculas)', () => {
    expect(verificarAcceso(cuenta('ana@aic.pe'), REGLAS).permitido).toBe(true);
    expect(verificarAcceso(cuenta('LUIS@jaicoscorp.com'), REGLAS).permitido).toBe(true);
  });
  it('rechaza otros dominios con un motivo claro', () => {
    const r = verificarAcceso(cuenta('alguien@gmail.com'), REGLAS);
    expect(r.permitido).toBe(false);
    expect(r.correo).toBe('alguien@gmail.com');
    expect(r.motivo).toMatch(/@aic\.pe o @jaicoscorp\.com/);
  });
  it('no se deja engañar por subdominios o dominios parecidos', () => {
    expect(verificarAcceso(cuenta('x@aic.pe.falso.com'), REGLAS).permitido).toBe(false);
    expect(verificarAcceso(cuenta('x@noaic.pe'), REGLAS).permitido).toBe(false);
    expect(verificarAcceso(cuenta('aic.pe@gmail.com'), REGLAS).permitido).toBe(false);
  });
  it('revisa el tenant si se configuró la lista', () => {
    const reglas = { ...REGLAS, tenantsPermitidos: [TENANT_AIC.toUpperCase()] };
    expect(verificarAcceso(cuenta('ana@aic.pe', TENANT_AIC), reglas).permitido).toBe(true);
    const r = verificarAcceso(cuenta('ana@aic.pe', TENANT_OTRO), reglas);
    expect(r.permitido).toBe(false);
    expect(r.motivo).toMatch(/organización/);
  });
  it('sin cuenta no hay acceso', () => {
    expect(verificarAcceso(null, REGLAS).permitido).toBe(false);
  });
  it('lista de dominios vacía = no se revisa el dominio', () => {
    expect(verificarAcceso(cuenta('x@otro.com'), { dominiosPermitidos: [] }).permitido).toBe(true);
  });
});

describe('construirAuthority y mensajes', () => {
  it('usa el tenant de la empresa o "organizations"', () => {
    expect(construirAuthority({ tenantId: TENANT_AIC })).toBe(`https://login.microsoftonline.com/${TENANT_AIC}`);
    expect(construirAuthority({})).toBe('https://login.microsoftonline.com/organizations');
  });
  it('explica errores comunes de Entra ID', () => {
    expect(explicarErrorLogin({ errorMessage: 'AADSTS50105: The signed in user is not assigned' })).toMatch(/no está asignado/);
    expect(explicarErrorLogin({ errorCode: 'user_cancelled' })).toMatch(/canceló/);
    // App de inquilino único usada sin tenantId (autoridad /organizations).
    expect(
      explicarErrorLogin({ errorMessage: "AADSTS50194: Application is not configured as a multi-tenant application." }),
    ).toMatch(/microsoft\.tenantId/);
    expect(explicarErrorLogin(new Error('raro'))).toMatch(/No se pudo iniciar sesión/);
  });
  it.each([
    [{ errorCode: 'invalid_grant', errorMessage: 'AADSTS65001: The user or administrator has not consented to use the application' }, 'AADSTS65001'],
    [{ errorMessage: 'AADSTS90094: The grant requires admin permission.' }, 'AADSTS90094'],
    [{ errorCode: 'consent_required', errorMessage: 'consent required' }, 'consent_required'],
    [{ errorCode: 'access_denied', errorMessage: 'Need admin approval' }, 'consent_required'],
    // Una directiva de la empresa impide que el usuario apruebe permisos (llega como access_denied).
    [
      {
        errorCode: 'access_denied',
        errorMessage: 'AADSTS90093: An administrator of JAICOS CORP S.A.C. has set a policy that prevents you from granting',
      },
      'AADSTS90093',
    ],
    // "AADSTS900941" (app considerada riesgosa) no se confunde con "AADSTS90094".
    [{ errorMessage: 'AADSTS900941: Administrator consent is required. App is considered risky.' }, 'AADSTS900941'],
  ])('falta el consentimiento de un administrador %j: explica qué hacer en Entra ID', (error: object, codigo: string) => {
    expect(esErrorConsentimiento(error)).toBe(true);
    const texto = explicarErrorLogin(error);
    expect(texto).toMatch(/un administrador apruebe el permiso de lectura de archivos/);
    expect(texto).toMatch(/"Buscador de centros de negocio"/);
    expect(texto).toMatch(/Entra ID → Registros de aplicaciones → Buscador de centros de negocio → Permisos de API/);
    // "Conceder consentimiento" solo aprueba lo que está en la lista: primero hay que revisar que Files.Read.All esté.
    expect(texto).toMatch(/revisar que "Files\.Read\.All" \(delegado\) esté en la lista/);
    expect(texto).toMatch(/Conceder consentimiento de administrador/);
    expect(texto).toContain(`(${codigo})`);
    expect(texto).not.toMatch(/Se canceló/);
  });
  it('AADSTS65004 (vuelve de "pedir aprobación al administrador" o canceló los permisos): explica ambos casos', () => {
    const error = { errorCode: 'access_denied', errorMessage: 'AADSTS65004: User declined to consent to access the app.' };
    const texto = explicarErrorLogin(error);
    expect(texto).toMatch(/No se aprobaron los permisos de la app/);
    expect(texto).toMatch(/Si pediste la aprobación de un administrador, espera a que la conceda/);
    expect(texto).toMatch(/Conceder consentimiento de administrador/);
    expect(texto).toMatch(/Si cancelaste tú, vuelve a iniciar sesión y acepta los permisos/);
    expect(texto).toContain('(AADSTS65004)');
    expect(texto).not.toMatch(/Se canceló el inicio de sesión/);
  });
  it('un código más largo que empieza igual no se toma por otro (AADSTS500111 no es AADSTS50011)', () => {
    expect(explicarErrorLogin({ errorMessage: 'AADSTS500111: algo distinto' })).toMatch(/No se pudo iniciar sesión/);
  });
});
