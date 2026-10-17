import { CAMPOS } from './filtros.ts';
import { TAMANOS_PAGINA } from './estado-url.ts';
import type { Campo, FetchFn } from './tipos.ts';

export interface ConfigMicrosoft {
  clientId: string;
  tenantId: string;
  tenantsPermitidos: string[];
  redirectUri: string;
  postLogoutRedirectUri: string;
  dominiosPermitidos: string[];
  scopes: string[];
  guardarSesion: 'localStorage' | 'sessionStorage';
}

export interface ConfigDatos {
  fuente: 'archivo-local' | 'graph';
  rutaLocal: string;
  urlCompartida: string;
  driveId: string;
  itemId: string;
  hoja: string;
  filaEncabezado: number | null;
  rellenarHaciaAbajo: Campo[];
}

export interface Config {
  modo: 'demo' | 'microsoft';
  titulo: string;
  subtitulo: string;
  microsoft: ConfigMicrosoft;
  datos: ConfigDatos;
  columnas: Partial<Record<Campo, string[]>>;
  camposObligatorios: Campo[];
  columnasOcultas: string[];
  autoActualizarMinutos: number;
  filasPorPagina: number;
}

export const CONFIG_POR_DEFECTO: Config = {
  modo: 'demo',
  titulo: 'Buscador de centros de negocio',
  subtitulo: 'Centros de negocio y sus órdenes de compra / servicio',

  microsoft: {
    clientId: '',
    tenantId: '',
    tenantsPermitidos: [],
    redirectUri: '',
    postLogoutRedirectUri: '',
    dominiosPermitidos: ['aic.pe', 'jaicoscorp.com'],
    scopes: ['User.Read', 'Files.Read.All'],
    guardarSesion: 'localStorage',
  },

  datos: {
    fuente: 'archivo-local',
    rutaLocal: 'datos/centros-ejemplo.xlsx',
    urlCompartida: '',
    driveId: '',
    itemId: '',
    hoja: '',
    filaEncabezado: null,
    rellenarHaciaAbajo: ['codigoCentro', 'descripcionCentro', 'cliente'],
  },

  columnas: {
    codigoCentro: [
      'codigo',
      'codigo centro',
      'codigo de centro',
      'codigo del centro',
      'codigo centro de negocio',
      'codigo del centro de negocio',
      'cod centro',
      'cod cn',
      'codigo cn',
      'centro de negocio',
      'centro de costo',
      'cn',
    ],
    descripcionCentro: [
      'descripcion',
      'descripcion centro',
      'descripcion del centro',
      'descripcion centro de negocio',
      'descripcion del centro de negocio',
      'nombre del centro',
      'nombre centro de negocio',
      'proyecto',
      'desc',
      'detalle',
    ],
    cliente: ['cliente', 'nombre cliente', 'nombre del cliente', 'razon social', 'razon social cliente'],
    ordenCompra: [
      'orden de compra',
      'orden de servicio',
      'orden de compra servicio',
      'orden',
      'n orden',
      'nro orden',
      'num orden',
      'numero de orden',
      'n de orden',
      'oc',
      'os',
      'oc os',
      'n oc',
      'nro oc',
      'n de oc',
      'nro de oc',
      'numero oc',
      'numero de oc',
      'orden compra',
      'orden servicio',
      'nro oc os',
      'n oc os',
    ],
    tipoOrden: ['tipo de orden', 'tipo orden', 'tipo', 'tipo de documento', 'tipo oc os'],
    estado: [
      'estado',
      'estado de la orden',
      'estado orden',
      'estado oc',
      'estado os',
      'estado de oc',
      'estado del centro',
      'estado centro de negocio',
      'situacion',
      'status',
    ],
  },

  camposObligatorios: ['codigoCentro', 'descripcionCentro', 'cliente', 'ordenCompra'],

  columnasOcultas: ['moneda', 'monto'],

  autoActualizarMinutos: 10,
  filasPorPagina: 50,
};

export type SinValidar<T> = { [K in keyof T]: unknown };

export type ConfigSinValidar = SinValidar<Config>;

const esObjeto = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

export function mezclarConfig<T extends object>(base: T, extra: unknown): SinValidar<T> {
  const resultado = structuredClone(base) as Record<string, unknown>;
  if (!esObjeto(extra)) return resultado as SinValidar<T>;
  for (const [clave, valor] of Object.entries(extra)) {
    if (clave.startsWith('_')) continue;
    const actual = resultado[clave];
    if (esObjeto(valor) && esObjeto(actual)) {
      resultado[clave] = mezclarConfig(actual, valor);
    } else if (valor !== undefined) {
      resultado[clave] = structuredClone(valor);
    }
  }
  return resultado as SinValidar<T>;
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esTexto = (v: unknown): v is string => typeof v === 'string';
const esListaDeTextos = (v: unknown): v is string[] => Array.isArray(v) && v.every(esTexto);
const esListaDeCampos = (v: unknown): v is Campo[] => Array.isArray(v) && v.every((c) => CAMPOS.includes(c));
const mostrar = (v: unknown): string => (v === undefined ? 'nada' : JSON.stringify(v));
const LISTA_CAMPOS = CAMPOS.join(', ');

export function validarConfig(config: ConfigSinValidar): string[] {
  const cfg: Record<string, unknown> = { ...config };
  const errores: string[] = [];
  if (!['demo', 'microsoft'].includes(cfg.modo as string)) {
    errores.push(`"modo" debe ser "demo" o "microsoft" (se encontró ${mostrar(cfg.modo)}).`);
  }
  for (const clave of ['titulo', 'subtitulo']) {
    if (cfg[clave] !== undefined && !esTexto(cfg[clave])) errores.push(`"${clave}" debe ser un texto entre comillas.`);
  }

  if (cfg.modo === 'microsoft') errores.push(...validarMicrosoft(cfg.microsoft));

  if (!esObjeto(cfg.datos)) {
    errores.push('"datos" debe ser un grupo de valores entre llaves { … }.');
  } else {
    errores.push(...validarDatos(cfg.datos, cfg.modo));
  }

  if (!esObjeto(cfg.columnas)) {
    errores.push('"columnas" debe ser un grupo { "codigoCentro": [ … ], "cliente": [ … ], … }.');
  } else {
    for (const [campo, alias] of Object.entries(cfg.columnas)) {
      if (!CAMPOS.includes(campo as Campo)) {
        errores.push(`"columnas.${campo}" no es un campo que la app conozca. Campos válidos: ${LISTA_CAMPOS}.`);
      } else if (!esListaDeTextos(alias)) {
        errores.push(`"columnas.${campo}" debe ser una lista de nombres entre corchetes, ej. ["Cliente", "Razón social"].`);
      }
    }
  }
  if (!esListaDeCampos(cfg.camposObligatorios)) {
    errores.push(`"camposObligatorios" debe ser una lista con algunos de estos campos: ${LISTA_CAMPOS}.`);
  }
  if (!esListaDeTextos(cfg.columnasOcultas)) {
    errores.push(
      '"columnasOcultas" debe ser una lista de palabras entre corchetes, ej. ["moneda", "monto"] ([] = no ocultar ninguna columna).',
    );
  }

  const minutos = cfg.autoActualizarMinutos;
  if (typeof minutos !== 'number' || !Number.isFinite(minutos) || minutos < 0) {
    errores.push(`"autoActualizarMinutos" debe ser un número de minutos (0 = no actualizar solo); se encontró ${mostrar(minutos)}.`);
  }
  if (!(TAMANOS_PAGINA as readonly unknown[]).includes(cfg.filasPorPagina)) {
    errores.push(`"filasPorPagina" debe ser ${TAMANOS_PAGINA.join(', ')} (se encontró ${mostrar(cfg.filasPorPagina)}).`);
  }
  return errores;
}

export type RevisionConfig = { valida: true; config: Config } | { valida: false; errores: string[] };

export function revisarConfig(config: ConfigSinValidar): RevisionConfig {
  const errores = validarConfig(config);
  return errores.length ? { valida: false, errores } : { valida: true, config: config as Config };
}

function validarMicrosoft(ms: unknown): string[] {
  if (!esObjeto(ms)) return ['"microsoft" debe ser un grupo de valores entre llaves { … }.'];
  const errores: string[] = [];
  if (!GUID.test(String(ms.clientId || '').trim())) {
    errores.push('Falta "microsoft.clientId" (el Id. de aplicación que da Entra ID al registrar la app).');
  }
  const tenant = esTexto(ms.tenantId) ? ms.tenantId.trim() : '';
  const tenants = esListaDeTextos(ms.tenantsPermitidos) ? ms.tenantsPermitidos.filter((t) => t.trim()) : [];
  if (!tenant) {
    errores.push(
      'Falta "microsoft.tenantId" (el Id. de directorio de AIC). La app se registra como "inquilino único" y sin ' +
        'este dato Microsoft rechaza el inicio de sesión (error AADSTS50194).',
    );
  } else if (tenant.toLowerCase() === 'organizations') {
    if (tenants.length === 0) {
      errores.push(
        'Con "microsoft.tenantId": "organizations" hay que poner los Id. de directorio aceptados en "microsoft.tenantsPermitidos".',
      );
    }
  } else if (!GUID.test(tenant) && !/\./.test(tenant)) {
    errores.push('"microsoft.tenantId" debe ser un Id. de directorio (GUID) o un dominio como "aic.pe".');
  }
  for (const clave of ['dominiosPermitidos', 'tenantsPermitidos']) {
    if (ms[clave] !== undefined && !esListaDeTextos(ms[clave])) {
      errores.push(
        `"microsoft.${clave}" debe ser una lista entre corchetes, ej. ["aic.pe", "jaicoscorp.com"] (aunque tenga un solo valor).`,
      );
    }
  }
  if (!esListaDeTextos(ms.scopes) || ms.scopes.length === 0) {
    errores.push('"microsoft.scopes" debe ser una lista de permisos, por ejemplo ["User.Read", "Files.Read.All"].');
  }
  for (const clave of ['redirectUri', 'postLogoutRedirectUri']) {
    const valor = ms[clave];
    if (valor && !(esTexto(valor) && /^https?:\/\//i.test(valor))) {
      errores.push(`"microsoft.${clave}" debe estar vacío o ser una dirección completa que empiece con https://`);
    }
  }
  if (!['localStorage', 'sessionStorage'].includes(ms.guardarSesion as string)) {
    errores.push('"microsoft.guardarSesion" debe ser "localStorage" o "sessionStorage".');
  }
  return errores;
}

function validarDatos(d: Record<string, unknown>, modo: unknown): string[] {
  const errores: string[] = [];
  if (!['archivo-local', 'graph'].includes(d.fuente as string)) {
    errores.push(`"datos.fuente" debe ser "archivo-local" o "graph" (se encontró ${mostrar(d.fuente)}).`);
  }
  for (const clave of ['rutaLocal', 'urlCompartida', 'driveId', 'itemId', 'hoja']) {
    if (d[clave] !== undefined && d[clave] !== null && !esTexto(d[clave])) {
      errores.push(`"datos.${clave}" debe ser un texto entre comillas.`);
    }
  }
  if (d.fuente === 'graph') {
    if (modo !== 'microsoft') {
      errores.push('Para leer el Excel de SharePoint/OneDrive ("graph") el modo debe ser "microsoft".');
    }
    if (!d.urlCompartida && !(d.driveId && d.itemId)) {
      errores.push('Falta "datos.urlCompartida" (el enlace del Excel en SharePoint/OneDrive) o "datos.driveId" + "datos.itemId".');
    }
    if (esTexto(d.urlCompartida) && d.urlCompartida.trim() && !/^https:\/\/\S+$/i.test(d.urlCompartida.trim())) {
      errores.push('"datos.urlCompartida" debe ser una dirección completa que empiece con https:// (sin espacios).');
    }
  }
  if (d.fuente === 'archivo-local' && !d.rutaLocal) {
    errores.push('Falta "datos.rutaLocal" (ruta del archivo Excel de ejemplo).');
  }
  const fila = d.filaEncabezado;
  if (fila !== undefined && fila !== null && fila !== '' && !(Number.isInteger(fila) && (fila as number) >= 1)) {
    errores.push(
      `"datos.filaEncabezado" debe ser un número de fila (1, 2, 3…) o null para que la app la detecte sola (se encontró ${mostrar(fila)}).`,
    );
  }
  if (!esListaDeCampos(d.rellenarHaciaAbajo)) {
    errores.push(`"datos.rellenarHaciaAbajo" debe ser una lista con algunos de estos campos: ${LISTA_CAMPOS} (o [] para no rellenar).`);
  }
  return errores;
}

export async function cargarConfig(url = 'config.json', fetchFn: FetchFn = globalThis.fetch): Promise<ConfigSinValidar> {
  let respuesta: Response;
  try {
    respuesta = await fetchFn(url, { cache: 'no-store' });
  } catch {
    throw new Error('No se pudo leer el archivo de configuración (config.json). Revisa tu conexión.');
  }
  if (!respuesta.ok) {
    throw new Error(`No se encontró el archivo de configuración (config.json). Código ${respuesta.status}.`);
  }
  let json: unknown;
  try {
    json = await respuesta.json();
  } catch {
    throw new Error(
      'El archivo config.json tiene un error de escritura (no es JSON válido). Revisa comas, comillas y llaves.',
    );
  }
  if (!esObjeto(json)) {
    throw new Error(
      'El archivo config.json debe empezar con { y terminar con } (un grupo de valores), no ser una lista ni un texto.',
    );
  }
  return mezclarConfig(CONFIG_POR_DEFECTO, json);
}
