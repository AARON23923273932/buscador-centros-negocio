// Tabla "Por centro de negocio": una fila por centro que se abre para ver sus órdenes (Table de shadcn/ui).
// memo(): no se vuelve a dibujar si sus props no cambian (ej. mientras se escribe en el buscador).
import { Fragment, memo, type MouseEvent } from 'react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { numero } from '../logica/formato.ts';
import { CLASE_ANCHA, CLASE_NUMERO } from '../logica/tabla.ts';
import type { Columna, Direccion, Grupo } from '../logica/tipos.ts';
import { ContenidoCelda, EncabezadoOrdenable, EncabezadosFijos, FilasDatos, FilaSinResultados, type AlCopiar } from './Celdas.tsx';
import { IconoFlecha } from './Iconos.tsx';
import { Resaltado } from './Resaltado.tsx';

interface Props {
  /** Centros de la página actual. */
  grupos: readonly Grupo[];
  columnas: readonly Columna[];
  /** Palabras del buscador (se resaltan en la columna de clientes). */
  terminos: readonly string[];
  terminosDe: (columna: Pick<Columna, 'campo'>) => readonly string[];
  /** Centros abiertos (por su clave). */
  expandidos: ReadonlySet<string>;
  ordenarPor: string;
  direccion: Direccion;
  hayDatos?: boolean;
  alOrdenar?: (clave: string) => void;
  alAlternar?: (clave: string) => void;
  alCopiar?: AlCopiar;
}

/** Fila de un centro abierto y la fila con sus órdenes: Light Blue (Dark Blue en modo oscuro), también al pasar el mouse. */
const ABIERTA = 'bg-fila-abierta even:bg-fila-abierta hover:bg-fila-abierta';

export const TablaCentros = memo(function TablaCentros({
  grupos,
  columnas,
  terminos,
  terminosDe,
  expandidos,
  ordenarPor,
  direccion,
  hayDatos = true,
  alOrdenar,
  alAlternar,
  alCopiar,
}: Props) {
  const colCodigo: Pick<Columna, 'campo'> = columnas.find((c) => c.campo === 'codigoCentro') || { campo: 'codigoCentro' };
  const colDescripcion: Pick<Columna, 'campo'> = columnas.find((c) => c.campo === 'descripcionCentro') || { campo: 'descripcionCentro' };
  const orden = { ordenarPor, direccion, alOrdenar };

  /** Clic en la fila del centro (en la flecha o en cualquier parte que no sea otro botón): abre/cierra. */
  const alHacerClic = (ev: MouseEvent<HTMLTableRowElement>, clave: string) => {
    const objetivo = ev.target;
    if (!(objetivo instanceof Element)) return;
    if (objetivo.closest('.btn-expandir') || !objetivo.closest('button, a, input, select')) alAlternar?.(clave);
  };

  return (
    <Table container={false} id="tabla-resultados">
      <caption className="sr-only">Centros de negocio. Pulsa la flecha de un centro para ver sus órdenes.</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="w-11 px-2">
            <span className="sr-only">Ver órdenes</span>
          </TableHead>
          <EncabezadoOrdenable clave="codigo" titulo="Código" {...orden} />
          <EncabezadoOrdenable clave="descripcion" titulo="Descripción" {...orden} />
          <EncabezadoOrdenable clave="cliente" titulo="Cliente(s)" {...orden} />
          <EncabezadoOrdenable clave="ordenes" titulo="N° de órdenes" {...orden} />
        </TableRow>
      </TableHeader>
      <TableBody>
        {!grupos.length && <FilaSinResultados columnas={5} hayDatos={hayDatos} />}
        {grupos.map((g, i) => {
          const abierto = expandidos.has(g.clave);
          const idDetalle = `detalle-centro-${i}`;
          const nombre = g.codigo || g.descripcion || 'sin código';
          return (
            <Fragment key={g.clave}>
              <TableRow className={cn('fila-centro cursor-pointer', abierto && `abierta ${ABIERTA}`)} data-grupo={g.clave} onClick={(ev) => alHacerClic(ev, g.clave)}>
                <TableCell className="w-11">
                  {/* Flecha: centrada con el código de su fila, sin hacerla más alta. Se apoya arriba de la línea
                      (align-top) y sobresale 3 px arriba y 5 px abajo: ocupa 20 px, lo mismo que la línea de texto. */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="btn-expandir -mt-[3px] -mb-[5px] size-7 align-top"
                    data-grupo={g.clave}
                    aria-expanded={abierto}
                    aria-controls={abierto ? idDetalle : undefined}
                  >
                    <IconoFlecha />
                    <span className="sr-only">
                      {abierto ? 'Ocultar' : 'Ver'} órdenes de {nombre}
                    </span>
                  </Button>
                </TableCell>
                <TableCell>
                  <ContenidoCelda columna={colCodigo} celda={{ t: g.codigo }} terminos={terminosDe(colCodigo)} alCopiar={alCopiar} />
                </TableCell>
                <TableCell className={CLASE_ANCHA}>
                  <Resaltado texto={g.descripcion} terminos={terminosDe(colDescripcion)} />
                </TableCell>
                <TableCell>
                  <Resaltado texto={g.clientes.join(', ')} terminos={terminos} />
                </TableCell>
                <TableCell className={CLASE_NUMERO}>
                  <Badge variant="secondary" className="insignia min-w-6">
                    {numero(g.ordenes)}
                  </Badge>
                </TableCell>
              </TableRow>
              {abierto && (
                <TableRow className={cn('fila-detalle', ABIERTA)} id={idDetalle}>
                  <TableCell colSpan={5} className="pt-0 pr-3 pb-3 pl-11 whitespace-normal max-escritorio:pl-3">
                    <div className="overflow-x-auto rounded-md border border-border bg-card">
                      <Table container={false} className="tabla-anidada">
                        <caption className="sr-only">Órdenes del centro {nombre}</caption>
                        <thead>
                          <EncabezadosFijos columnas={columnas} enLinea />
                        </thead>
                        <tbody>
                          <FilasDatos columnas={columnas} filas={g.filas} terminosDe={terminosDe} alCopiar={alCopiar} />
                        </tbody>
                      </Table>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
});
