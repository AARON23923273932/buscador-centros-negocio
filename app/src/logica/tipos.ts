// =============================================================================
// tipos.ts — "Forma" de los datos que se pasan entre las piezas de la app.
//
// TypeScript revisa (al escribir y con "npm run typecheck") que cada función
// reciba y devuelva exactamente esto. Si alguien cambia una forma, el editor
// marca en rojo todos los lugares que hay que ajustar.
// =============================================================================

/** Campos lógicos que la app entiende (los nombres reales de las columnas van en config.json). */
export type Campo = 'codigoCentro' | 'descripcionCentro' | 'cliente' | 'ordenCompra' | 'tipoOrden' | 'estado';

/**
 * Celda ya limpia (la arma datos.ts a partir de la celda de SheetJS):
 *   t = texto que se ve · o = valor para ordenar · v = valor para exportar
 *   z = formato de Excel (opcional) · e = la celda tiene un error de fórmula (#N/A…)
 */
export interface Celda {
  t: string;
  o: number | string;
  v: number | string;
  z?: string;
  e?: boolean;
}

/** Texto de cada campo lógico en una fila ('' si el Excel no tiene esa columna). */
export type CamposFila = Record<Campo, string>;

/** Fila tal como sale del Excel: número de fila, celdas visibles y campos lógicos. */
export interface FilaBase {
  /** Número de fila en el Excel (1, 2, 3…). */
  id: number;
  celdas: Celda[];
  campos: CamposFila;
}

/** Textos precalculados para que la búsqueda sea rápida (los agrega prepararFila). */
export interface DatosBusqueda {
  _busqueda: string;
  _compacta: string;
  _norm: Record<Campo, string>;
}

/** Fila lista para buscar, filtrar, ordenar y agrupar. */
export type Fila = FilaBase & DatosBusqueda;

/** Columna visible del Excel. */
export interface Columna {
  /** Posición dentro de fila.celdas. */
  indice: number;
  /** Letra de la columna en el Excel ("A", "B"…). */
  letra: string;
  titulo: string;
  /** Campo lógico que la app reconoció en esta columna (o null: se muestra tal cual). */
  campo: Campo | null;
  /** Identificador estable para ordenar y en la URL ("codigoCentro", "col-fecha"…). */
  clave: string;
  /** "numero" = casi todo números o fechas (se alinea a la derecha). */
  tipo: 'numero' | 'texto';
}

/** Qué columna (posición en fila.celdas) es cada campo lógico. */
export type MapaCampos = Partial<Record<Campo, number>>;

/** Resultado de leer el Excel (leerLibro). */
export interface ResultadoLectura {
  hoja: string;
  hojas: string[];
  /** Fila de los títulos (1, 2…) o null si la hoja está vacía. */
  filaEncabezado: number | null;
  columnas: Columna[];
  filas: Fila[];
  mapa: MapaCampos;
  faltantes: { campo: Campo; nombre: string }[];
  filasVacias: number;
  encabezadosRepetidos: number;
  filasRellenadas: number;
  formulasSinCalcular: number;
  celdasConError: number;
  /** Columnas que no se muestran (config "columnasOcultas"). */
  columnasOcultas: { letra: string; titulo: string }[];
}

/** Un centro de negocio con sus órdenes (vista "Por centro"). */
export interface Grupo {
  clave: string;
  codigo: string;
  descripcion: string;
  clientes: string[];
  /** Cantidad de órdenes distintas. */
  ordenes: number;
  filas: Fila[];
  /** Fila del Excel donde aparece por primera vez (desempate al ordenar). */
  primeraFila: number;
}

/** Una página de resultados. desde/hasta empiezan en 1 (0 si no hay resultados). */
export interface Pagina<T> {
  items: T[];
  pagina: number;
  totalPaginas: number;
  total: number;
  desde: number;
  hasta: number;
}

/** Claves de los filtros: q = buscador global; las demás son los filtros del panel. */
export type ClaveFiltro = 'q' | 'cliente' | 'codigo' | 'descripcion' | 'orden' | 'tipo' | 'estado';
export type Filtros = Record<ClaveFiltro, string>;

export type Direccion = 'asc' | 'desc';
export type Vista = 'orden' | 'centro';

/** Todo lo que la persona eligió (se guarda en la URL para compartir el enlace). */
export interface EstadoBusqueda extends Filtros {
  vista: Vista;
  ordenarPor: string;
  direccion: Direccion;
  pagina: number;
  tamano: number;
}

/** Opciones de una petición (solo lo que usa la app). */
export interface OpcionesPedido {
  headers?: Record<string, string>;
  cache?: RequestCache;
}

/** fetch() o uno de mentira en las pruebas. */
export type FetchFn = (url: string, opciones?: OpcionesPedido) => Promise<Response>;

/** Dónde se encontró el Excel en SharePoint/OneDrive. */
export type OrigenExcel = 'config' | 'enlace' | 'busqueda' | 'memoria';

/** El Excel descargado. */
export interface ArchivoExcel {
  contenido: ArrayBuffer;
  modificado: Date | null;
  nombre: string;
  eTag: string | null;
  // Solo con el Excel de SharePoint/OneDrive:
  driveId?: string | null;
  itemId?: string | null;
  origen?: OrigenExcel;
}

/** Botón dentro de un aviso o de una pantalla de mensaje. */
export interface Accion {
  texto: string;
  accion: () => void;
  principal?: boolean;
}
