import { memo } from 'react';
import { Table, TableBody, TableHeader, TableRow } from '@/components/ui/table';
import type { Columna, Direccion, Fila } from '../logica/tipos.ts';
import { EncabezadoOrdenable, FilasDatos, FilaSinResultados, type AlCopiar } from './Celdas.tsx';

interface Props {
  columnas: readonly Columna[];
  filas: readonly Fila[];
  terminosDe: (columna: Columna) => readonly string[];
  ordenarPor: string;
  direccion: Direccion;
  hayDatos?: boolean;
  alOrdenar?: (clave: string) => void;
  alCopiar?: AlCopiar;
}

export const TablaOrdenes = memo(function TablaOrdenes({ columnas, filas, terminosDe, ordenarPor, direccion, hayDatos = true, alOrdenar, alCopiar }: Props) {
  if (!columnas.length) {
    return <p className="px-4 py-8 text-center text-muted-foreground">El Excel no tiene columnas con datos.</p>;
  }
  return (
    <Table id="tabla-resultados">
      <caption className="sr-only">Resultados de la búsqueda. Pulsa un título de columna para ordenar.</caption>
      <TableHeader>
        <TableRow>
          {columnas.map((c) => (
            <EncabezadoOrdenable key={c.indice} clave={c.clave} titulo={c.titulo} ordenarPor={ordenarPor} direccion={direccion} alOrdenar={alOrdenar} />
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.length ? (
          <FilasDatos columnas={columnas} filas={filas} terminosDe={terminosDe} alCopiar={alCopiar} />
        ) : (
          <FilaSinResultados columnas={columnas.length} hayDatos={hayDatos} />
        )}
      </TableBody>
    </Table>
  );
});
