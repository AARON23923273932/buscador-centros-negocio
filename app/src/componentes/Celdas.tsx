// Piezas comunes de las dos tablas: título que ordena, contenido de una celda, filas de datos
// y el mensaje "No hay resultados".
import type { Celda, Columna, Fila } from '../logica/tipos.ts';
import { claseColumna, estadoOrden } from '../logica/tabla.ts';
import { IconoCopiar } from './Iconos.tsx';
import { Resaltado } from './Resaltado.tsx';

/** Copiar un código (lo hace la pantalla principal: copia y avisa). */
export type AlCopiar = (texto: string) => void;

/** Título de columna con botón para ordenar (▲ ▼) y aria-sort para los lectores de pantalla. */
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
  direccion: string;
  clase?: string;
  alOrdenar?: (clave: string) => void;
}) {
  const e = estadoOrden(clave, ordenarPor, direccion);
  const siguiente = e.aria === 'ascending' ? 'descendente' : 'ascendente';
  return (
    <th scope="col" aria-sort={e.aria} className={clase}>
      <button
        type="button"
        className={`btn-orden${e.activo ? ' activo' : ''}`}
        data-orden={clave}
        title={`Ordenar por ${titulo} (${siguiente})`}
        onClick={() => alOrdenar?.(clave)}
      >
        <span>{titulo}</span>
        <span className="icono-orden" aria-hidden="true">
          {e.icono}
        </span>
      </button>
    </th>
  );
}

/** Contenido de una celda. La del código de centro lleva el botón "copiar". */
export function ContenidoCelda({
  columna,
  celda,
  terminos,
  alCopiar,
}: {
  columna: Pick<Columna, 'campo'>;
  celda: Pick<Celda, 't'> | undefined;
  terminos: readonly string[];
  alCopiar?: AlCopiar;
}) {
  const texto = celda?.t ?? '';
  const contenido = <Resaltado texto={texto} terminos={terminos} />;
  if (columna.campo === 'codigoCentro' && texto) {
    return (
      <span className="celda-codigo">
        <span className="codigo">{contenido}</span>
        <button
          type="button"
          className="btn-copiar"
          data-copiar={texto}
          aria-label={`Copiar código ${texto}`}
          title="Copiar código"
          onClick={(ev) => {
            // Que el clic no abra/cierre la fila del centro (vista "Por centro").
            ev.stopPropagation();
            alCopiar?.(texto);
          }}
        >
          <IconoCopiar />
        </button>
      </span>
    );
  }
  return contenido;
}

/** Filas de datos (una por fila del Excel). */
export function FilasDatos({
  columnas,
  filas,
  terminosDe,
  alCopiar,
}: {
  columnas: readonly Columna[];
  filas: readonly Fila[];
  terminosDe: (columna: Columna) => readonly string[];
  alCopiar?: AlCopiar;
}) {
  return (
    <>
      {filas.map((fila) => (
        <tr key={fila.id} data-fila={fila.id}>
          {columnas.map((col) => (
            <td key={col.indice} className={claseColumna(col)}>
              <ContenidoCelda columna={col} celda={fila.celdas[col.indice]} terminos={terminosDe(col)} alCopiar={alCopiar} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** "No hay resultados…" o "El Excel no tiene filas con datos todavía." */
export function FilaSinResultados({ columnas, hayDatos }: { columnas: number; hayDatos: boolean }) {
  const mensaje = hayDatos
    ? 'No hay resultados con esa búsqueda o filtros. Prueba con menos palabras o pulsa “Limpiar filtros”.'
    : 'El Excel no tiene filas con datos todavía.';
  return (
    <tr className="fila-vacia">
      <td colSpan={columnas}>{mensaje}</td>
    </tr>
  );
}
