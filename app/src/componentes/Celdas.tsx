// Piezas comunes de las tablas (Table de shadcn/ui): título que ordena, contenido de una celda, filas de datos
// y el mensaje "No hay resultados".
// A la Table de shadcn/ui solo se le agregan: el encabezado de marca y las filas alternas (guía de AIC, con las
// variables del tema: logica/tabla.ts) y clases de medidas y ubicación.
import { memo, type ComponentProps, type ReactNode } from 'react';
import { Link, useInRouterContext, useLocation } from 'react-router';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { codigoEnlazable, rutaDetalleCentro, type EstadoNavegacion } from '../logica/rutas.ts';
import type { Celda, Columna, Direccion, Fila } from '../logica/tipos.ts';
import { CLASE_ENCABEZADO, CLASE_ENCABEZADO_FIJO, CLASE_FILA_ALTERNA, claseColumna, estadoOrden } from '../logica/tabla.ts';
import { IconoCopiar, IconoOrden } from './Iconos.tsx';
import { Resaltado, ResaltadoOrdenes } from './Resaltado.tsx';

/** Copiar un código (lo hace la pantalla principal: copia y avisa). */
export type AlCopiar = (texto: string) => void;

/**
 * Caja con scroll de una tabla (lista y detalle): una Card de shadcn/ui (su borde, esquinas y sombra). El
 * encabezado de la tabla se queda fijo arriba al bajar. Solo se le agregan medidas: alto máximo y scroll, sin el
 * espacio interior de la tarjeta, y el contenedor propio de la Table de shadcn/ui sin scroll
 * ([&>[data-slot=table-container]]:overflow-visible): con dos cajas con scroll, el encabezado fijo se quedaría
 * dentro de la de adentro (que no baja) y no arriba de la que baja. Con el teclado: role="region" y tabIndex 0
 * (se baja con las flechas); su foco es el contorno de estilos.css.
 */
export function CajaTabla({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      role="region"
      tabIndex={0}
      className={cn(
        'max-h-[max(360px,calc(100vh-260px))] gap-0 overflow-auto overscroll-contain py-0 max-escritorio:max-h-[70vh] print:max-h-none print:overflow-visible [&>[data-slot=table-container]]:overflow-visible',
        className,
      )}
      {...props}
    />
  );
}

/** Mensaje en lugar de la tabla ("Cargando datos del Excel…", "No hay datos para mostrar…"). */
export function MensajeTabla(props: ComponentProps<'div'>) {
  return <div className="flex items-center justify-center gap-2.5 px-4 py-12 text-center text-muted-foreground" {...props} />;
}

/**
 * Título de columna con botón para ordenar (▲ ▼) y aria-sort para los lectores de pantalla.
 * El botón ocupa toda la celda del encabezado (fondo Primary Blue de la guía). Es un <button> simple y no el
 * Button de shadcn/ui: sus variantes son para fondos claros (con "ghost", el mouse encima pondría un fondo claro
 * en el encabezado y en oscuro el texto no llegaría al contraste AA). Toma el color del texto del encabezado; con
 * el mouse encima se subraya (como los enlaces de shadcn/ui) y con el teclado lleva un contorno de 2 px de ese
 * mismo color, por dentro (blanco sobre Primary Blue: 11:1).
 */
export function EncabezadoOrdenable({
  clave,
  titulo,
  ordenarPor,
  direccion,
  clase = '',
  alOrdenar,
}: {
  clave: string;
  titulo: string;
  ordenarPor: string;
  direccion: Direccion;
  clase?: string;
  alOrdenar?: (clave: string) => void;
}) {
  const e = estadoOrden(clave, ordenarPor, direccion);
  const siguiente = e.aria === 'ascending' ? 'descendente' : 'ascendente';
  return (
    <TableHead scope="col" aria-sort={e.aria} className={cn(CLASE_ENCABEZADO, CLASE_ENCABEZADO_FIJO, 'p-0', clase)}>
      <button
        type="button"
        className="flex h-10 w-full items-center justify-center gap-2 px-2 whitespace-nowrap underline-offset-4 hover:underline focus-visible:outline-current focus-visible:-outline-offset-4"
        data-orden={clave}
        title={`Ordenar por ${titulo} (${siguiente})`}
        onClick={() => alOrdenar?.(clave)}
      >
        <span>{titulo}</span>
        <IconoOrden aria={e.aria} />
      </button>
    </TableHead>
  );
}

/**
 * Código de un centro como enlace a su detalle (/centros/:codigo). Lleva la misma query (búsqueda y
 * filtros) para que "Volver" regrese a la lista tal como estaba, y recuerda desde qué lista se abrió.
 * Cada enlace lee la dirección por su cuenta: si cambia, solo se redibujan los enlaces (no la tabla).
 * Las clases "codigo enlace-codigo" se dibujan en estilos.css (las usan las pruebas y VistaLista.tsx).
 */
function EnlaceCentro({ codigo, children }: { codigo: string; children: ReactNode }) {
  const { pathname, search } = useLocation();
  const estado: EstadoNavegacion = { desde: pathname };
  return (
    <Link className="codigo enlace-codigo" to={{ pathname: rutaDetalleCentro(codigo), search }} state={estado} title="Ver el detalle de este centro">
      {children}
    </Link>
  );
}

/**
 * Texto del código: enlace al detalle (dentro de la app) o texto simple (en el detalle, sin React Router, o
 * con un código que no puede ir en una dirección: "." y "..", ver codigoEnlazable).
 */
function TextoCodigo({ codigo, enlazar, children }: { codigo: string; enlazar: boolean; children: ReactNode }) {
  const conRutas = useInRouterContext();
  if (enlazar && conRutas && codigoEnlazable(codigo)) return <EnlaceCentro codigo={codigo}>{children}</EnlaceCentro>;
  return <span className="codigo">{children}</span>;
}

/**
 * Botón "copiar" junto al código (Button "ghost" de shadcn/ui, tamaño icon-xs: 24 px). No agranda la fila:
 * sobresale 2 px arriba y abajo de la línea de texto (20 px).
 * Para los lectores de pantalla se llama "Copiar código …" (aria-label). No lleva ayuda flotante (Tooltip): habría
 * una por fila y, con 250 filas por página, cambiar de página era bastante más lento. Tampoco "title": el lector de
 * pantalla lo leería otra vez después del nombre. Al copiar, el aviso flotante dice "Código … copiado".
 */
function BotonCopiar({ texto, alCopiar }: { texto: string; alCopiar?: AlCopiar }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="btn-copiar -my-0.5 print:hidden"
      data-copiar={texto}
      aria-label={`Copiar código ${texto}`}
      onClick={(ev) => {
        // Que el clic no abra/cierre la fila del centro (vista "Por centro").
        ev.stopPropagation();
        alCopiar?.(texto);
      }}
    >
      <IconoCopiar />
    </Button>
  );
}

/**
 * Contenido de una celda. La del código de centro es un enlace a su detalle y lleva el botón "copiar"; la de
 * órdenes muestra una orden por línea (una celda puede traer varias).
 */
export function ContenidoCelda({
  columna,
  celda,
  terminos,
  alCopiar,
  enlazar = true,
}: {
  columna: Pick<Columna, 'campo'>;
  celda: Pick<Celda, 't'> | undefined;
  terminos: readonly string[];
  alCopiar?: AlCopiar;
  /** false = el código no es enlace (ej. dentro del detalle de ese mismo centro). */
  enlazar?: boolean;
}) {
  const texto = celda?.t ?? '';
  // Órdenes: una por línea (una celda del Excel puede traer varias: "OC 3519155 OC 3519252…").
  if (columna.campo === 'ordenCompra') return <ResaltadoOrdenes texto={texto} terminos={terminos} />;
  const contenido = <Resaltado texto={texto} terminos={terminos} />;
  if (columna.campo === 'codigoCentro' && texto) {
    return (
      <span className="celda-codigo inline-flex items-center gap-1">
        <TextoCodigo codigo={texto} enlazar={enlazar}>
          {contenido}
        </TextoCodigo>
        <BotonCopiar texto={texto} alCopiar={alCopiar} />
      </span>
    );
  }
  return contenido;
}

/**
 * Filas de datos (una por fila del Excel), con filas alternas (guía de AIC).
 * memo(): en la vista "Por centro", abrir o cerrar un centro no vuelve a dibujar las órdenes de los otros centros abiertos.
 */
export const FilasDatos = memo(function FilasDatos({
  columnas,
  filas,
  terminosDe,
  alCopiar,
  enlazarCodigo = true,
}: {
  columnas: readonly Columna[];
  filas: readonly Fila[];
  terminosDe: (columna: Columna) => readonly string[];
  alCopiar?: AlCopiar;
  /** false = el código del centro no es enlace (detalle de ese mismo centro). */
  enlazarCodigo?: boolean;
}) {
  return (
    <>
      {filas.map((fila, i) => (
        <TableRow key={fila.id} data-fila={fila.id} className={i % 2 === 1 ? CLASE_FILA_ALTERNA : undefined}>
          {columnas.map((col) => (
            <TableCell key={col.indice} className={claseColumna(col)}>
              <ContenidoCelda
                columna={col}
                celda={fila.celdas[col.indice]}
                terminos={terminosDe(col)}
                alCopiar={alCopiar}
                enlazar={enlazarCodigo}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
});

/**
 * Títulos de columna que no ordenan (tabla de un centro abierto y detalle del centro), con el encabezado de marca.
 * @param enLinea  true = no se quedan fijos arriba al bajar (tabla dentro de otra tabla: ahí el fijo es el de afuera)
 */
export function EncabezadosFijos({ columnas, enLinea = false }: { columnas: readonly Pick<Columna, 'indice' | 'titulo'>[]; enLinea?: boolean }) {
  return (
    <TableRow>
      {columnas.map((c) => (
        <TableHead key={c.indice} scope="col" className={cn(CLASE_ENCABEZADO, !enLinea && CLASE_ENCABEZADO_FIJO)}>
          {c.titulo}
        </TableHead>
      ))}
    </TableRow>
  );
}

/** "No hay resultados…" o "El Excel no tiene filas con datos todavía." */
export function FilaSinResultados({ columnas, hayDatos }: { columnas: number; hayDatos: boolean }) {
  const mensaje = hayDatos
    ? 'No hay resultados con esa búsqueda o filtros. Prueba con menos palabras o pulsa “Limpiar filtros”.'
    : 'El Excel no tiene filas con datos todavía.';
  return (
    <TableRow className="fila-vacia">
      <TableCell colSpan={columnas} className="px-4 py-10 text-center whitespace-normal">
        {mensaje}
      </TableCell>
    </TableRow>
  );
}
