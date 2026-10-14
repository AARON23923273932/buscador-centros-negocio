// =============================================================================
// config.ts — Lee config.json al abrir la página (cambiarlo no requiere tocar el código).
// El que se edita es app/public/config.json; "npm run build" lo copia a dist/.
//
// Si en config.json falta algún dato, se usa el valor "por defecto" de abajo.
// Las claves que empiezan con "_" (ej. "_ayuda") son comentarios y se ignoran.
// validarConfig() revisa que cada dato tenga la forma correcta y explica en
// español qué arreglar (se muestra en la pantalla "Falta configurar la aplicación").
//
// Ojo: config.json lo escribe una persona, así que puede traer cualquier cosa. Por eso hay dos tipos:
//   ConfigSinValidar = lo que devuelve cargarConfig(): las claves de Config, pero cada valor "unknown"
//   Config           = la forma CORRECTA; solo la entrega revisarConfig() cuando no hay errores.
// Así TypeScript no deja usar la configuración antes de revisarla.
// =============================================================================

import { CAMPOS } from './filtros.ts';
import { TAMANOS_PAGINA } from './estado-url.ts';
import type { Campo, FetchFn } from './tipos.ts';

/** Sección "microsoft": inicio de sesión con Entra ID. */
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

/** Sección "datos": de dónde y cómo se lee el Excel. */
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

/** Configuración completa (ya mezclada con los valores por defecto y revisada con revisarConfig). */
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
  // "demo" = sin login, lee el Excel de ejemplo. "microsoft" = login con cuenta de la empresa.
  modo: 'demo',
  titulo: 'Buscador de centros de negocio',
  subtitulo: 'Centros de negocio y sus órdenes de compra / servicio',

  microsoft: {
    clientId: '', // "Id. de aplicación (cliente)" de Entra ID (por confirmar)
    tenantId: '', // "Id. de directorio (inquilino)" de AIC (por confirmar). OBLIGATORIO en modo "microsoft".
    tenantsPermitidos: [], // vacío = no se revisa el tenant (lo limita el tipo de registro de la app)
    redirectUri: '', // vacío = <dirección de la app>/redirect.html
    postLogoutRedirectUri: '', // vacío = <dirección de la app>/
    dominiosPermitidos: ['aic.pe', 'jaicoscorp.com'], // confirmados el 12/10/2026
    scopes: ['User.Read', 'Files.Read.All'],
    guardarSesion: 'localStorage', // "localStorage" (recuerda la sesión) o "sessionStorage" (solo esta pestaña)
  },

  datos: {
    // "archivo-local" = un .xlsx publicado junto a la app (solo para demo).
    // "graph" = el Excel real en SharePoint/OneDrive, leído con la cuenta del usuario.
    fuente: 'archivo-local',
    rutaLocal: 'datos/centros-ejemplo.xlsx',
    // Enlace del Excel: el de "Compartir → Copiar vínculo" o la dirección del navegador al abrirlo en
    // Excel Online (…/_layouts/15/Doc.aspx?sourcedoc=…&file=…). Ver graph.ts.
    urlCompartida: '',
    driveId: '', // alternativa al enlace: driveId + itemId
    itemId: '',
    hoja: '', // nombre de la hoja; vacío = la primera
    filaEncabezado: null, // número de fila de los títulos (1, 2, …); vacío = detectar sola
    // Si una fila tiene orden pero NO tiene código ni descripción del centro (el centro se escribió
    // una sola vez, más arriba), se copian estos campos de la fila de arriba. [] = no copiar nada.
    rellenarHaciaAbajo: ['codigoCentro', 'descripcionCentro', 'cliente'],
  },

  // Campo lógico -> posibles nombres del encabezado en el Excel (sin importar tildes/mayúsculas).
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

  // Si alguno de estos campos no se encuentra en el Excel, se muestra un aviso.
  // (Tipo de orden y Estado no son obligatorios: si faltan, su filtro simplemente no aparece.)
  camposObligatorios: ['codigoCentro', 'descripcionCentro', 'cliente', 'ordenCompra'],

  // Columnas del Excel que la app NO muestra, NO busca y NO exporta. Se ocultan las que tengan una de estas
  // palabras en el título (ej. "Monto", "Monto total", "Moneda", "Monto (S/)"), salvo las que la app usa
  // como código, descripción, cliente, orden, tipo o estado. [] = no ocultar ninguna.
  columnasOcultas: ['moneda', 'monto'],

  autoActualizarMinutos: 10, // 0 = no actualizar solo
  filasPorPagina: 50,
};

/** Mismas claves que T, pero cada valor puede ser cualquier cosa (todavía no se revisó). */
export type SinValidar<T> = { [K in keyof T]: unknown };

/** config.json mezclado con los valores por defecto, TODAVÍA SIN REVISAR (ver revisarConfig). */
export type ConfigSinValidar = SinValidar<Config>;

const esObjeto = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Mezcla "profunda": toma la base y la sobreescribe con lo que venga en "extra".
 * Las listas se reemplazan completas. Las claves que empiezan con "_" se ignoran.
 * El resultado tiene las claves de la base, pero sus valores pueden venir mal escritos (por eso SinValidar).
 */
export function mezclarConfig<T extends object>(base: T, extra: unknown): SinValidar<T> {
  const resultado = structuredClone(base) as Record<string, unknown>; // (la copia vista como "clave → valor")
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
  // Tiene todas las claves de la base (es una copia de ella) y valores "unknown": la forma de SinValidar<T>.
  return resultado as SinValidar<T>;
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esTexto = (v: unknown): v is string => typeof v === 'string';
const esListaDeTextos = (v: unknown): v is string[] => Array.isArray(v) && v.every(esTexto);
const esListaDeCampos = (v: unknown): v is Campo[] => Array.isArray(v) && v.every((c) => CAMPOS.includes(c));
const mostrar = (v: unknown): string => (v === undefined ? 'nada' : JSON.stringify(v));
const LISTA_CAMPOS = CAMPOS.join(', ');

/** Revisa la configuración y devuelve una lista de problemas (en español). Vacía = todo bien. */
export function validarConfig(config: ConfigSinValidar): string[] {
  // Se revisa como "cualquier cosa": config.json puede traer valores del tipo equivocado.
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

/** Resultado de revisarConfig: la configuración ya con su tipo correcto, o la lista de problemas. */
export type RevisionConfig = { valida: true; config: Config } | { valida: false; errores: string[] };

/**
 * Revisa la configuración: si no tiene problemas, la devuelve como Config (la forma correcta).
 * Es el ÚNICO lugar donde una ConfigSinValidar pasa a ser Config.
 * (En modo "demo" la sección "microsoft" no se revisa porque no se usa.)
 */
export function revisarConfig(config: ConfigSinValidar): RevisionConfig {
  const errores = validarConfig(config);
  // Sin errores, cada valor tiene la forma que exige Config: es justo lo que comprueba validarConfig().
  return errores.length ? { valida: false, errores } : { valida: true, config: config as Config };
}

/** Revisión de la sección "microsoft" (solo en modo "microsoft"). */
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
    // Multiinquilino a propósito (no recomendado): entonces la lista de tenants es obligatoria.
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

/** Revisión de la sección "datos". */
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

/**
 * Descarga y mezcla config.json (todavía sin revisar: ver revisarConfig).
 * Lanza un Error con mensaje claro si no se puede leer.
 */
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
