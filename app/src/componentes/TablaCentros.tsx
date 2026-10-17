import { Fragment, memo, type MouseEvent } from 'react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { numero } from '../logica/formato.ts';
import { CLASE_ANCHA, CLASE_ENCABEZADO, CLASE_ENCABEZADO_FIJO, CLASE_FILA_ALTERNA, CLASE_NUMERO } from '../logica/tabla.ts';
import type { Columna, Direccion, Grupo } from '../logica/tipos.ts';
import { ContenidoCelda, EncabezadoOrdenable, EncabezadosFijos, FilasDatos, FilaSinResultados, type AlCopiar } from './Celdas.tsx';
import { IconoFlecha } from './Iconos.tsx';
import { Resaltado } from './Resaltado.tsx';

interface Props {
  grupos: readonly Grupo[];
  columnas: readonly Columna[];
  terminos: readonly string[];
  terminosDe: (columna: Pick<Columna, 'campo'>) => readonly string[];
  expandidos: ReadonlySet<string>;
  ordenarPor: string;
  direccion: Direccion;
  hayDatos?: boolean;
  alOrdenar?: (clave: string) => void;
  alAlternar?: (clave: string) => void;
  alCopiar?: AlCopiar;
}

const SELECCIONADA = 'selected';

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

  const alHacerClic = (ev: MouseEvent<HTMLTableRowElement>, clave: string) => {
    const objetivo = ev.target;
    if (!(objetivo instanceof Element)) return;
    if (objetivo.closest('.btn-expandir') || !objetivo.closest('button, a, input, select')) alAlternar?.(clave);
  };

  return (
    <Table id="tabla-resultados">
      <caption className="sr-only">Centros de negocio. Pulsa la flecha de un centro para ver sus órdenes.</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className={cn(CLASE_ENCABEZADO, CLASE_ENCABEZADO_FIJO, 'w-11')}>
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
              <TableRow
                className={cn('fila-centro cursor-pointer', i % 2 === 1 && !abierto && CLASE_FILA_ALTERNA, abierto && 'abierta')}
                data-state={abierto ? SELECCIONADA : undefined}
                data-grupo={g.clave}
                onClick={(ev) => alHacerClic(ev, g.clave)}
              >
                <TableCell className="w-11">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    className="btn-expandir -my-0.5 align-top"
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
                <TableRow className="fila-detalle" data-state={SELECCIONADA} id={idDetalle}>
                  <TableCell colSpan={5} className="pt-0 pr-3 pb-3 pl-11 whitespace-normal max-escritorio:pl-3">
                    <Card className="gap-0 py-0">
                      <Table className="tabla-anidada">
                        <caption className="sr-only">Órdenes del centro {nombre}</caption>
                        <TableHeader>
                          <EncabezadosFijos columnas={columnas} enLinea />
                        </TableHeader>
                        <TableBody>
                          <FilasDatos columnas={columnas} filas={g.filas} terminosDe={terminosDe} alCopiar={alCopiar} />
                        </TableBody>
                      </Table>
                    </Card>
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
