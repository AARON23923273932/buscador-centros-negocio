// Tabla "Por orden": una fila por cada fila del Excel.
import { claseColumna } from '../logica/tabla.ts';
import type { Columna, Fila } from '../logica/tipos.ts';
import { EncabezadoOrdenable, FilasDatos, FilaSinResultados, type AlCopiar } from './Celdas.tsx';

interface Props {
  columnas: readonly Columna[];
  /** Filas de la página actual. */
  filas: readonly Fila[];
  terminosDe: (columna: Columna) => readonly string[];
  ordenarPor: string;
  direccion: string;
  /** false = el Excel no tiene filas (cambia el mensaje cuando no hay resultados). */
  hayDatos?: boolean;
  alOrdenar?: (clave: string) => void;
  alCopiar?: AlCopiar;
}

export function TablaOrdenes({ columnas, filas, terminosDe, ordenarPor, direccion, hayDatos = true, alOrdenar, alCopiar }: Props) {
  if (!columnas.length) {
    return <p className="tabla-vacia">El Excel no tiene columnas con datos.</p>;
  }
  return (
    <table className="tabla" id="tabla-resultados">
      <caption className="solo-lectores">Resultados de la búsqueda. Pulsa un título de columna para ordenar.</caption>
      <thead>
        <tr>
          {columnas.map((c) => (
            <EncabezadoOrdenable
              key={c.indice}
              clave={c.clave}
              titulo={c.titulo}
              ordenarPor={ordenarPor}
              direccion={direccion}
              clase={claseColumna(c)}
              alOrdenar={alOrdenar}
            />
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.length ? (
          <FilasDatos columnas={columnas} filas={filas} terminosDe={terminosDe} alCopiar={alCopiar} />
        ) : (
          <FilaSinResultados columnas={columnas.length} hayDatos={hayDatos} />
        )}
      </tbody>
    </table>
  );
}
