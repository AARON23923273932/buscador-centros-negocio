// =============================================================================
// graph.ts — Lee el Excel desde SharePoint/OneDrive usando Microsoft Graph.
//
// Microsoft Graph es la "puerta de entrada" (API) a los datos de Microsoft 365.
// Aquí se usa con permisos DELEGADOS: la app solo puede ver lo que el propio
// usuario ya puede ver. Si al usuario no le compartieron el Excel, Graph
// responde 403/404 y la app muestra un mensaje claro.
//
// Cómo se encuentra el Excel (en este orden):
//   1. "datos.driveId" + "datos.itemId" de config.json (lo más directo).
//   2. Lo encontrado antes en esta pestaña (se guarda en sessionStorage para no
//      buscarlo de nuevo en cada actualización automática).
//   3. "datos.urlCompartida" como enlace para compartir: GET /shares/u!{enlace}/driveItem
//   4. Si (3) falla (o apunta a una carpeta o a otro archivo) y el enlace es la dirección
//      del navegador de Excel Online (…/_layouts/15/Doc.aspx?sourcedoc={GUID}&file=Nombre.xlsx),
//      se busca el archivo en las bibliotecas de ese sitio de SharePoint por su GUID y su nombre.
// =============================================================================

import type { ArchivoExcel, FetchFn, OrigenExcel } from './tipos.ts';

export const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

/** Clase de problema, para mostrar el mensaje adecuado en pantalla. */
export type TipoErrorDatos =
  | 'sin-permiso'
  | 'no-encontrado'
  | 'sin-red'
  | 'sesion'
  | 'consentimiento'
  | 'formato'
  | 'hoja'
  | 'configuracion'
  | 'ocupado'
  | 'descarga'
  | 'otro';

/** Error con un "tipo" para mostrar el mensaje adecuado en pantalla. */
export class ErrorDatos extends Error {
  tipo: TipoErrorDatos;
  /** Error original (para la consola). */
  declare causa?: unknown;
  /** Código HTTP de la respuesta de Microsoft (si lo hubo). */
  declare status?: number;
  /** Código de error que devolvió Graph (ej. "accessDenied"). */
  declare codigoGraph?: string;
  /** El enlace apunta a una carpeta. */
  declare esCarpeta?: boolean;

  /**
   * @param tipo  clase de problema
   * @param mensaje  texto en español para el usuario
   * @param causa  error original (para la consola)
   */
  constructor(tipo: TipoErrorDatos, mensaje: string, causa?: unknown) {
    super(mensaje);
    this.name = 'ErrorDatos';
    this.tipo = tipo;
    if (causa !== undefined) this.causa = causa;
  }
}

/** Dónde está el Excel según config.datos (cualquiera de las dos formas). */
export interface UbicacionExcel {
  urlCompartida?: string;
  driveId?: string;
  itemId?: string;
}

/** Identificadores de un archivo en Graph. */
export interface IdsExcel {
  driveId: string;
  itemId: string;
}

/** Datos del archivo (sin el contenido). */
export interface MetadatosExcel {
  origen: OrigenExcel;
  driveId: string | null;
  itemId: string | null;
  nombre: string;
  eTag: string | null;
  modificado: Date | null;
  /** Enlace temporal de descarga (ya autorizado; dura pocos minutos). */
  urlDescarga: string | null;
}

/** Lo que devuelve Graph para un archivo o carpeta (solo lo que usa la app). */
interface ItemGraph {
  id?: string;
  name?: string;
  eTag?: string;
  cTag?: string;
  lastModifiedDateTime?: string;
  file?: object;
  folder?: object;
  parentReference?: { driveId?: string };
  sharepointIds?: { listItemUniqueId?: string };
  '@microsoft.graph.downloadUrl'?: string;
}

/** Una página de una lista de Graph. */
interface ListaGraph<T> {
  value?: T[];
  '@odata.nextLink'?: unknown;
}

/** Cuerpo de una respuesta de error de Graph. */
interface ErrorGraph {
  error?: { code?: string };
}

/** Dirección del navegador de Excel Online, ya analizada. */
export interface InfoUrlNavegador {
  host: string;
  /** "" para el sitio raíz, o "/sites/Area". */
  rutaSitio: string;
  /** "sourcedoc": el identificador único del archivo en SharePoint (sharepointIds.listItemUniqueId). */
  guid: string;
  /** Nombre del archivo ("file"); puede venir vacío. */
  nombre: string;
}

/** Lugar donde recordar lo encontrado (sessionStorage o uno de mentira en las pruebas). */
export type Almacen = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Convierte un enlace para compartir en el identificador que pide Graph:
 * "u!" + base64url(enlace). Ver: GET /shares/{id}/driveItem
 */
export function codificarUrlCompartida(url: string): string {
  const bytes = new TextEncoder().encode(String(url).trim());
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return 'u!' + btoa(binario).replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-');
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "{E20FAA1A-…}" -> "e20faa1a-…" (sin llaves y en minúsculas, para comparar). */
const limpiarGuid = (valor: unknown): string =>
  String(valor || '')
    .replace(/[{}]/g, '')
    .trim()
    .toLowerCase();

/**
 * Reconoce la dirección que muestra el navegador al abrir un Excel en Excel Online:
 *   https://empresa.sharepoint.com/:x:/r/sites/Area/_layouts/15/Doc.aspx?sourcedoc=%7BGUID%7D&file=Nombre.xlsx&…
 * (con o sin "/:x:/r", con o sin "/sites/Area" o "/teams/Area" antes de "/_layouts").
 * Devuelve { host, rutaSitio, guid, nombre } o null si no es una dirección de ese tipo.
 */
export function analizarUrlNavegador(url: unknown): InfoUrlNavegador | null {
  let u: URL;
  try {
    u = new URL(String(url || '').trim());
  } catch {
    return null;
  }
  const partes = /^(.*?)\/_layouts\/15\/[\w.-]+\.aspx$/i.exec(u.pathname);
  const guid = limpiarGuid(u.searchParams.get('sourcedoc'));
  if (!partes || !GUID.test(guid)) return null;
  // "/:x:/r" es el prefijo de los enlaces "de redirección" de SharePoint: no es parte del sitio.
  const rutaSitio = partes[1].replace(/^\/:[a-z]:\/r(?=\/|$)/i, '').replace(/\/+$/, '');
  return {
    host: u.hostname.toLowerCase(),
    rutaSitio,
    guid,
    nombre: (u.searchParams.get('file') || '').trim(),
  };
}

const rutaDeIds = ({ driveId, itemId }: { driveId?: string; itemId?: string }): string =>
  `/drives/${encodeURIComponent(String(driveId).trim())}/items/${encodeURIComponent(String(itemId).trim())}`;

/** Ruta del archivo en Graph según config.datos (sin búsquedas: driveId + itemId, o el enlace). */
export function rutaItem(datos: UbicacionExcel | null | undefined): string {
  if (datos?.driveId && datos?.itemId) return rutaDeIds(datos);
  if (datos?.urlCompartida) {
    return `/shares/${codificarUrlCompartida(datos.urlCompartida)}/driveItem`;
  }
  throw new ErrorDatos(
    'configuracion',
    'Falta configurar dónde está el Excel: "datos.urlCompartida" o "datos.driveId" + "datos.itemId" en config.json.',
  );
}

/** Traduce una respuesta con error de Graph a un mensaje en español (guarda el código HTTP en "status"). */
export async function errorDesdeRespuesta(respuesta: Response): Promise<ErrorDatos> {
  let codigo = '';
  try {
    const cuerpo = (await respuesta.json()) as ErrorGraph | null;
    codigo = cuerpo?.error?.code || '';
  } catch {
    /* sin cuerpo JSON */
  }
  const extra = codigo ? ` (código: ${codigo})` : '';
  let error: ErrorDatos;
  switch (respuesta.status) {
    case 401:
      error = new ErrorDatos('sesion', `Tu sesión de Microsoft venció. Vuelve a iniciar sesión.${extra}`);
      break;
    case 403:
      error = new ErrorDatos(
        'sin-permiso',
        'Tu cuenta no tiene permiso para abrir el Excel. Pide a quien administra el archivo en SharePoint/OneDrive ' +
          'que te dé acceso de lectura. Si a todas las personas les pasa lo mismo, el problema no es el archivo: ' +
          `quien administra la app debe revisar sus permisos en Entra ID (guía de configuración, pasos 2 y 4.3).${extra}`,
      );
      break;
    case 404:
      error = new ErrorDatos(
        'no-encontrado',
        `No se encontró el Excel. Puede que lo hayan movido, que el enlace haya cambiado o que no te lo hayan compartido.${extra}`,
      );
      break;
    case 429:
    case 503:
    case 504:
      error = new ErrorDatos('ocupado', `Microsoft está ocupado en este momento. Vuelve a intentar en unos minutos.${extra}`);
      break;
    default:
      error = new ErrorDatos('otro', `No se pudo leer el Excel (código ${respuesta.status}).${extra}`);
  }
  error.status = respuesta.status;
  if (codigo) error.codigoGraph = codigo;
  return error;
}

async function pedir(fetchFn: FetchFn, url: string, opciones: Parameters<FetchFn>[1]): Promise<Response> {
  try {
    return await fetchFn(url, opciones);
  } catch (e) {
    throw new ErrorDatos('sin-red', 'No hay conexión: no se pudo contactar a Microsoft. Revisa tu internet y vuelve a intentar.', e);
  }
}

/** GET a Graph con el token. Devuelve la respuesta tal cual (sin revisar si salió bien). */
function pedirGraph(fetchFn: FetchFn, token: string, ruta: string, cabecerasExtra: Record<string, string> = {}): Promise<Response> {
  return pedir(fetchFn, GRAPH_BASE + ruta, { headers: { Authorization: `Bearer ${token}`, ...cabecerasExtra } });
}

/** GET a Graph que debe salir bien: devuelve el JSON o lanza un ErrorDatos. */
async function pedirJson<T>(fetchFn: FetchFn, token: string, ruta: string, cabecerasExtra?: Record<string, string>): Promise<T> {
  const respuesta = await pedirGraph(fetchFn, token, ruta, cabecerasExtra);
  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta);
  return (await respuesta.json()) as T;
}

/** Tope de páginas que se leen de una lista de Graph (bibliotecas o resultados de búsqueda). */
export const MAX_PAGINAS = 5;

/** Respuestas que significan "por aquí no está" (se sigue buscando en otro lado). */
const NO_ESTA_AQUI = new Set([400, 403, 404]);

/** Falla de Microsoft en una sola biblioteca (500, 503…): se salta esa biblioteca y se sigue con las demás. */
const esFallaDelServidor = (status: number | undefined): boolean => (status ?? 0) >= 500;

/** Resultado de leer una lista de Graph página por página. */
interface ResultadoLista<T> {
  /** Respuesta de la PRIMERA página (si falló, valores = [] y quien llama decide qué hacer). */
  respuesta: Response;
  valores: T[];
  /** Error de una página siguiente que falló con 400/403/404/5xx (se usa lo ya leído). */
  fallaParcial: ErrorDatos | null;
}

/**
 * Pide una lista a Graph y sigue "@odata.nextLink" (la dirección de la página siguiente) hasta MAX_PAGINAS.
 * La página siguiente es una dirección completa: se pide tal cual, y solo si es de graph.microsoft.com
 * (para no enviar el token a otro lado).
 */
async function pedirLista<T>(fetchFn: FetchFn, token: string, ruta: string): Promise<ResultadoLista<T>> {
  const respuesta = await pedirGraph(fetchFn, token, ruta);
  if (!respuesta.ok) return { respuesta, valores: [], fallaParcial: null };
  let cuerpo = (await respuesta.json()) as ListaGraph<T>;
  const valores = [...(cuerpo.value || [])];
  for (let pagina = 1; pagina < MAX_PAGINAS; pagina++) {
    const siguiente = cuerpo['@odata.nextLink'];
    if (typeof siguiente !== 'string' || !siguiente.startsWith(`${GRAPH_BASE}/`)) break;
    const r = await pedir(fetchFn, siguiente, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) {
      const error = await errorDesdeRespuesta(r);
      if (!NO_ESTA_AQUI.has(r.status) && !esFallaDelServidor(r.status)) throw error; // sesión vencida, ocupado…
      console.warn('No se pudo leer la página siguiente de resultados de Graph; se usa lo ya leído.', error);
      return { respuesta, valores, fallaParcial: error };
    }
    cuerpo = (await r.json()) as ListaGraph<T>;
    valores.push(...(cuerpo.value || []));
  }
  return { respuesta, valores, fallaParcial: null };
}

// ---------------------------------------------------------------------------
// Memoria de la pestaña: driveId + itemId encontrados por búsqueda
// ---------------------------------------------------------------------------

const PREFIJO_MEMORIA = 'buscador-cn.excel-resuelto:';

/** sessionStorage del navegador (o null si no hay o está bloqueado). */
function almacenPorDefecto(): Almacen | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

function leerMemoria(almacen: Almacen | null | undefined, url: string): IdsExcel | null {
  try {
    const guardado = JSON.parse(almacen?.getItem(PREFIJO_MEMORIA + url) || 'null') as Partial<IdsExcel> | null;
    return guardado?.driveId && guardado?.itemId ? { driveId: guardado.driveId, itemId: guardado.itemId } : null;
  } catch {
    return null;
  }
}

function guardarMemoria(almacen: Almacen | null | undefined, url: string, ids: IdsExcel): void {
  try {
    almacen?.setItem(PREFIJO_MEMORIA + url, JSON.stringify({ driveId: ids.driveId, itemId: ids.itemId }));
  } catch {
    /* sin almacenamiento: se volverá a buscar la próxima vez */
  }
}

function borrarMemoria(almacen: Almacen | null | undefined, url: string): void {
  try {
    almacen?.removeItem(PREFIJO_MEMORIA + url);
  } catch {
    /* nada que borrar */
  }
}

// ---------------------------------------------------------------------------
// Búsqueda del Excel en SharePoint (cuando el enlace es la dirección del navegador)
// ---------------------------------------------------------------------------

const mismoNombre = (a: unknown, b: unknown): boolean =>
  String(a || '').normalize('NFC').trim().toLowerCase() === String(b || '').normalize('NFC').trim().toLowerCase();

/**
 * Ruta de búsqueda de Graph dentro de una biblioteca: /drives/{id}/root/search(q='texto').
 * En OData, una comilla simple dentro del texto se escribe doble ("O'Brien" -> 'O''Brien').
 */
export function rutaBusqueda(driveId: string, texto: string): string {
  const q = encodeURIComponent(String(texto).replace(/'/g, "''"));
  return `/drives/${encodeURIComponent(driveId)}/root/search(q='${q}')`;
}

/**
 * Bibliotecas de documentos del sitio. El sitio se nombra por su dirección
 * (/sites/{host} = sitio raíz, /sites/{host}:/sites/Area: = otro sitio) dentro de la misma consulta,
 * sin pedir el sitio aparte (GET /sites/{host} exige Sites.Read.All según la documentación de Graph).
 * (por confirmar) La documentación da Files.Read(.All) para GET /sites/{id-del-sitio}/drives, pero no dice
 * nada de esta forma con la dirección del sitio: si Graph respondiera 403, el mensaje explica qué hacer.
 */
async function listarBibliotecas(info: InfoUrlNavegador, token: string, fetchFn: FetchFn): Promise<{ id: string }[]> {
  const sitio = info.rutaSitio ? `${info.host}:${info.rutaSitio}:` : info.host;
  const { respuesta, valores } = await pedirLista<{ id?: string }>(fetchFn, token, `/sites/${sitio}/drives?$select=id,name,driveType`);
  if (respuesta.status === 403) {
    const original = await errorDesdeRespuesta(respuesta);
    const error = new ErrorDatos(
      'sin-permiso',
      `No se pudo ver las bibliotecas de documentos del sitio de SharePoint (${info.host}${info.rutaSitio || ''}) ` +
        'para buscar el Excel. Si solo te pasa a ti, pide acceso de lectura al Excel a quien lo administra. Si les ' +
        'pasa a todas las personas, la app no alcanza con su permiso actual: quien la administra debe fijar ' +
        '"datos.driveId" + "datos.itemId" en config.json (se sacan con el Probador de Graph: guía, paso 4.3, forma A) ' +
        'o agregar el permiso Sites.Read.All con consentimiento de administrador (guía, paso 2).' +
        (original.codigoGraph ? ` (código: ${original.codigoGraph})` : ''),
      original,
    );
    error.status = 403;
    throw error;
  }
  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta);
  return valores.filter((d): d is { id: string } => Boolean(d?.id));
}

/**
 * Revisa la respuesta de una consulta hecha en UNA biblioteca:
 *   OK -> la respuesta · 400/403/404 -> null (por aquí no está) ·
 *   5xx -> null, y el error se guarda en "fallas" (se sigue con las demás bibliotecas) ·
 *   401, 429… -> se lanza (sesión vencida, Microsoft ocupado: no tiene sentido seguir).
 */
async function revisarEnBiblioteca(respuesta: Response, fallas: ErrorDatos[]): Promise<Response | null> {
  if (respuesta.ok) return respuesta;
  if (NO_ESTA_AQUI.has(respuesta.status)) return null;
  const error = await errorDesdeRespuesta(respuesta);
  if (!esFallaDelServidor(respuesta.status)) throw error;
  console.warn('Una biblioteca de SharePoint respondió con un error; se sigue buscando en las demás.', error);
  fallas.push(error);
  return null;
}

/** Lee un archivo de una biblioteca pidiendo sus identificadores de SharePoint (null si "no está aquí"). */
async function leerConIdsSharePoint(
  driveId: string,
  itemId: string,
  token: string,
  fetchFn: FetchFn,
  fallas: ErrorDatos[],
): Promise<ItemGraph | null> {
  const respuesta = await pedirGraph(fetchFn, token, `${rutaDeIds({ driveId, itemId })}?$select=id,name,file,folder,sharepointIds`);
  const ok = await revisarEnBiblioteca(respuesta, fallas);
  return ok ? ((await ok.json()) as ItemGraph) : null;
}

/**
 * Encuentra el Excel de una dirección Doc.aspx: { driveId, itemId }.
 *   a) En cada biblioteca del sitio se pide el archivo directamente por su GUID (Graph acepta el
 *      identificador único de SharePoint en lugar del id del archivo).
 *   b) Si no aparece, se busca por nombre en cada biblioteca y se elige el que tenga el mismo GUID.
 *      Si ninguno tiene el GUID pero hay UN solo archivo con ese nombre, se usa (con un aviso en consola).
 */
export async function buscarExcelEnSharePoint(
  info: InfoUrlNavegador,
  token: string,
  fetchFn: FetchFn = globalThis.fetch,
): Promise<IdsExcel> {
  const bibliotecas = await listarBibliotecas(info, token, fetchFn);
  const fallas: ErrorDatos[] = []; // errores 5xx de bibliotecas que se saltaron

  // a) Directo por el GUID del enlace.
  for (const b of bibliotecas) {
    const item = await leerConIdsSharePoint(b.id, info.guid, token, fetchFn, fallas);
    if (item?.id && !item.folder) {
      const guid = limpiarGuid(item.sharepointIds?.listItemUniqueId);
      if (!guid || guid === info.guid) return { driveId: b.id, itemId: item.id };
    }
  }

  // b) Por nombre ("centros-negocio-aic.xlsx" y, si no aparece, "centros-negocio-aic").
  const lugar = `${info.host}${info.rutaSitio || ''}`;
  if (!info.nombre) {
    if (fallas.length) throw fallas[0];
    throw new ErrorDatos(
      'no-encontrado',
      `No se encontró el Excel en SharePoint (${lugar}) y el enlace no trae el nombre del archivo. ` +
        'Usa el enlace de "Compartir → Copiar vínculo" o "datos.driveId" + "datos.itemId" en config.json.',
    );
  }
  const consultas = [...new Set([info.nombre, info.nombre.replace(/\.[^.]+$/, '')])].filter(Boolean);
  const candidatos: IdsExcel[] = [];
  for (const b of bibliotecas) {
    for (const consulta of consultas) {
      // Con muchos resultados Graph responde por páginas: se leen hasta MAX_PAGINAS.
      const { respuesta, valores, fallaParcial } = await pedirLista<ItemGraph>(fetchFn, token, rutaBusqueda(b.id, consulta));
      if (!(await revisarEnBiblioteca(respuesta, fallas))) break; // en esta biblioteca no se puede buscar: siguiente
      if (fallaParcial && esFallaDelServidor(fallaParcial.status)) fallas.push(fallaParcial);
      const iguales = valores.filter(
        (x): x is ItemGraph & { id: string } => Boolean(x?.id) && !x.folder && mismoNombre(x.name, info.nombre),
      );
      for (const x of iguales) {
        if (!candidatos.some((c) => c.driveId === b.id && c.itemId === x.id)) candidatos.push({ driveId: b.id, itemId: x.id });
      }
      if (iguales.length) break;
    }
  }

  for (const c of candidatos) {
    const item = await leerConIdsSharePoint(c.driveId, c.itemId, token, fetchFn, fallas);
    if (limpiarGuid(item?.sharepointIds?.listItemUniqueId) === info.guid) return c;
  }
  if (candidatos.length === 1) {
    console.warn(
      `Aviso: el Excel "${info.nombre}" se encontró por su nombre, pero su identificador de SharePoint no coincide ` +
        `con el del enlace (${info.guid}). Se usa igual porque es el único con ese nombre.`,
      candidatos[0],
    );
    return candidatos[0];
  }
  // Alguna biblioteca falló (5xx) y en las demás no apareció: el Excel podría estar justo en esa.
  if (fallas.length) throw fallas[0];
  if (candidatos.length > 1) {
    throw new ErrorDatos(
      'no-encontrado',
      `Se encontraron ${candidatos.length} archivos llamados "${info.nombre}" en SharePoint (${lugar}), pero ninguno ` +
        'es el del enlace configurado. Revisa que tu cuenta pueda abrir el Excel en SharePoint, o fija ' +
        '"datos.driveId" + "datos.itemId" en config.json.',
    );
  }
  throw new ErrorDatos(
    'no-encontrado',
    `No se encontró el Excel "${info.nombre}" en SharePoint (${lugar}). Revisa que tu cuenta pueda abrirlo en ` +
      'SharePoint (si no lo ves allí, pide acceso de lectura). Si lo movieron o le cambiaron el nombre, hay que ' +
      'actualizar "datos.urlCompartida" en config.json.',
  );
}

// ---------------------------------------------------------------------------
// Metadatos y descarga
// ---------------------------------------------------------------------------

/** Pide los datos de un archivo ya ubicado (ruta de Graph) y los deja en el formato de la app. */
async function leerItem(
  fetchFn: FetchFn,
  token: string,
  ruta: string,
  origen: OrigenExcel,
  ids: Partial<IdsExcel> = {},
): Promise<MetadatosExcel> {
  // Para enlaces "personas de la organización", Graph da acceso como si el usuario abriera el enlace.
  const extra: Record<string, string> = ruta.startsWith('/shares/') ? { Prefer: 'redeemSharingLinkIfNecessary' } : {};
  const item = await pedirJson<ItemGraph>(fetchFn, token, ruta, extra);
  if (item.folder) {
    const error = new ErrorDatos('configuracion', 'El enlace configurado apunta a una carpeta, no a un archivo de Excel.');
    error.esCarpeta = true;
    throw error;
  }
  const fecha = item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime) : null;
  return {
    origen,
    driveId: item.parentReference?.driveId || ids.driveId || null,
    itemId: item.id || ids.itemId || null,
    nombre: item.name || 'Excel',
    eTag: item.eTag || item.cTag || null,
    modificado: fecha && !Number.isNaN(fecha.getTime()) ? fecha : null,
    urlDescarga: item['@microsoft.graph.downloadUrl'] || null,
  };
}

/** Opciones de obtenerMetadatos. */
export interface OpcionesMetadatos {
  /** Dónde recordar lo encontrado (por defecto sessionStorage; null = no recordar). */
  almacen?: Almacen | null;
}

/** El error dice "por aquí no está" o "es una carpeta"? (para seguir buscando) */
const sePuedeBuscar = (e: unknown): boolean =>
  e instanceof ErrorDatos ? NO_ESTA_AQUI.has(e.status ?? 0) || Boolean(e.esCarpeta) : false;

/**
 * Pide los datos del archivo (nombre, fecha de modificación, enlace de descarga, driveId/itemId).
 * Es una consulta liviana: sirve para saber si el Excel cambió sin descargarlo.
 */
export async function obtenerMetadatos(
  datos: UbicacionExcel,
  token: string,
  fetchFn: FetchFn = globalThis.fetch,
  opciones: OpcionesMetadatos = {},
): Promise<MetadatosExcel> {
  const ruta = rutaItem(datos); // driveId + itemId, o el enlace (sin ninguno: error de configuración)
  if (datos.driveId && datos.itemId) return leerItem(fetchFn, token, ruta, 'config', datos);
  const url = String(datos.urlCompartida).trim();
  const almacen = 'almacen' in opciones ? opciones.almacen : almacenPorDefecto();

  // Lo encontrado antes en esta pestaña. Si ya no existe (404), se olvida y se vuelve a buscar UNA vez.
  const recordado = leerMemoria(almacen, url);
  if (recordado) {
    try {
      return await leerItem(fetchFn, token, rutaDeIds(recordado), 'memoria', recordado);
    } catch (e) {
      if (!(e instanceof ErrorDatos && e.status === 404)) throw e;
      console.warn('El Excel ya no está donde se encontró antes; se vuelve a buscar.', recordado);
      borrarMemoria(almacen, url);
    }
  }

  // Un enlace de "Copiar vínculo" (no es una dirección Doc.aspx): no hay con qué buscar, se usa tal cual.
  const info = analizarUrlNavegador(url);
  if (!info) return leerItem(fetchFn, token, ruta, 'enlace');

  let porEnlace: MetadatosExcel | null = null;
  try {
    porEnlace = await leerItem(fetchFn, token, ruta, 'enlace');
  } catch (e) {
    // Con la dirección del navegador (Doc.aspx) se puede buscar: si "no está aquí" o es una carpeta.
    if (!sePuedeBuscar(e)) throw e;
    console.warn(
      'El enlace no se pudo abrir como "enlace para compartir"; se buscará el Excel en SharePoint por su identificador.',
      e,
    );
  }
  if (porEnlace) {
    if (!info.nombre || mismoNombre(porEnlace.nombre, info.nombre)) return porEnlace;
    console.warn(`El enlace abrió "${porEnlace.nombre}" y no "${info.nombre}"; se busca el Excel por su identificador.`);
  }

  try {
    const ids = await buscarExcelEnSharePoint(info, token, fetchFn);
    guardarMemoria(almacen, url, ids);
    return await leerItem(fetchFn, token, rutaDeIds(ids), 'busqueda', ids);
  } catch (e) {
    if (!porEnlace) throw e;
    // La búsqueda no lo confirmó (ej. le cambiaron el nombre al archivo): se usa el que abrió el enlace.
    console.warn('No se encontró el Excel buscándolo; se usa el archivo que abrió el enlace.', e);
    return porEnlace;
  }
}

const MENSAJE_DESCARGA =
  'No se pudo descargar el Excel desde SharePoint/OneDrive. Vuelve a intentar en unos minutos; si sigue pasando, avisa al administrador.';

/**
 * Descarga el contenido del Excel con el "@microsoft.graph.downloadUrl": un enlace temporal
 * (dura pocos minutos) que ya viene autorizado, así que NO se le envía el token.
 * No se usa el endpoint /content porque responde con una redirección que el navegador bloquea (CORS).
 * Devuelve null si no hay enlace o si ya venció (401/403): hay que pedir los metadatos de nuevo.
 */
export async function descargarContenido(
  meta: Pick<MetadatosExcel, 'urlDescarga'>,
  fetchFn: FetchFn = globalThis.fetch,
): Promise<ArrayBuffer | null> {
  if (!meta.urlDescarga) return null;
  let respuesta: Response;
  try {
    respuesta = await fetchFn(meta.urlDescarga, {});
  } catch (e) {
    throw new ErrorDatos('descarga', MENSAJE_DESCARGA, e);
  }
  if (respuesta.ok) return respuesta.arrayBuffer();
  if (respuesta.status === 401 || respuesta.status === 403) return null;
  throw await errorDesdeRespuesta(respuesta);
}

/** Metadatos + contenido en un solo paso (si el enlace temporal venció, se pide uno nuevo una vez). */
export async function descargarDesdeGraph(
  datos: UbicacionExcel,
  obtenerToken: () => Promise<string>,
  fetchFn: FetchFn = globalThis.fetch,
  opciones: OpcionesMetadatos = {},
): Promise<ArchivoExcel> {
  const token = await obtenerToken();
  let meta = await obtenerMetadatos(datos, token, fetchFn, opciones);
  let contenido = await descargarContenido(meta, fetchFn);
  if (contenido === null) {
    meta = await obtenerMetadatos(datos, token, fetchFn, opciones);
    contenido = await descargarContenido(meta, fetchFn);
    if (contenido === null) throw new ErrorDatos('descarga', MENSAJE_DESCARGA);
  }
  return {
    contenido,
    modificado: meta.modificado,
    nombre: meta.nombre,
    eTag: meta.eTag,
    driveId: meta.driveId,
    itemId: meta.itemId,
    origen: meta.origen,
  };
}
