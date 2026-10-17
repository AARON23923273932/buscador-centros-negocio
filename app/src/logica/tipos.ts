export type Campo = 'codigoCentro' | 'descripcionCentro' | 'cliente' | 'ordenCompra' | 'tipoOrden' | 'estado';

export interface Celda {
  t: string;
  o: number | string;
  v: number | string;
  z?: string;
  e?: boolean;
}

export type CamposFila = Record<Campo, string>;

export interface FilaBase {
  id: number;
  celdas: Celda[];
  campos: CamposFila;
}

export interface DatosBusqueda {
  _busqueda: string;
  _compacta: string;
  _norm: Record<Campo, string>;
}

export type Fila = FilaBase & DatosBusqueda;

export interface Columna {
  indice: number;
  letra: string;
  titulo: string;
  campo: Campo | null;
  clave: string;
  tipo: 'numero' | 'texto';
}

export type MapaCampos = Partial<Record<Campo, number>>;

export interface ResultadoLectura {
  hoja: string;
  hojas: string[];
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
  columnasOcultas: { letra: string; titulo: string }[];
}

export interface Grupo {
  clave: string;
  codigo: string;
  descripcion: string;
  clientes: string[];
  ordenes: number;
  filas: Fila[];
  primeraFila: number;
}

export interface Pagina<T> {
  items: T[];
  pagina: number;
  totalPaginas: number;
  total: number;
  desde: number;
  hasta: number;
}

export type ClaveFiltro = 'q' | 'cliente' | 'codigo' | 'descripcion' | 'orden' | 'tipo' | 'estado';
export type Filtros = Record<ClaveFiltro, string>;

export type Direccion = 'asc' | 'desc';
export type Vista = 'orden' | 'centro';

export interface EstadoBusqueda extends Filtros {
  vista: Vista;
  ordenarPor: string;
  direccion: Direccion;
  pagina: number;
  tamano: number;
}

export interface OpcionesPedido {
  headers?: Record<string, string>;
  cache?: RequestCache;
}

export type FetchFn = (url: string, opciones?: OpcionesPedido) => Promise<Response>;

export type OrigenExcel = 'config' | 'enlace' | 'busqueda' | 'memoria';

export interface ArchivoExcel {
  contenido: ArrayBuffer;
  modificado: Date | null;
  nombre: string;
  eTag: string | null;
  driveId?: string | null;
  itemId?: string | null;
  origen?: OrigenExcel;
}

export interface Accion {
  texto: string;
  accion: () => void;
  principal?: boolean;
}
