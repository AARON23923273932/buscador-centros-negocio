// Clases de Tailwind que comparten varias pantallas (así se ven igual en la lista y en el detalle).

/** Caja con scroll de una tabla (el encabezado de la tabla se queda fijo arriba al bajar). Foco con el teclado: borde + anillo. */
export const CONTENEDOR_TABLA =
  'foco-control relative max-h-[max(360px,calc(100vh-260px))] overflow-auto overscroll-contain rounded-lg border border-border bg-card max-escritorio:max-h-[70vh] print:max-h-none print:overflow-visible';

/** Mensaje en lugar de la tabla ("Cargando datos del Excel…", "No hay datos para mostrar…"). */
export const ESTADO_TABLA = 'flex items-center justify-center gap-2.5 px-4 py-12 text-center text-muted-foreground';
