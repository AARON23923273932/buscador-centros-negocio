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

export type AlCopiar = (texto: string) => void;

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

export function MensajeTabla(props: ComponentProps<'div'>) {
  return <div className="flex items-center justify-center gap-2.5 px-4 py-12 text-center text-muted-foreground" {...props} />;
}

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

function EnlaceCentro({ codigo, children }: { codigo: string; children: ReactNode }) {
  const { pathname, search } = useLocation();
  const estado: EstadoNavegacion = { desde: pathname };
  return (
    <Link className="codigo enlace-codigo" to={{ pathname: rutaDetalleCentro(codigo), search }} state={estado} title="Ver el detalle de este centro">
      {children}
    </Link>
  );
}

function TextoCodigo({ codigo, enlazar, children }: { codigo: string; enlazar: boolean; children: ReactNode }) {
  const conRutas = useInRouterContext();
  if (enlazar && conRutas && codigoEnlazable(codigo)) return <EnlaceCentro codigo={codigo}>{children}</EnlaceCentro>;
  return <span className="codigo">{children}</span>;
}

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
        ev.stopPropagation();
        alCopiar?.(texto);
      }}
    >
      <IconoCopiar />
    </Button>
  );
}

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
  enlazar?: boolean;
}) {
  const texto = celda?.t ?? '';
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
