// Piezas comunes de las tablas: título que ordena, contenido de una celda, filas de datos
// y el mensaje "No hay resultados".
import { memo, type ReactNode } from 'react';
import { Link, useInRouterContext, useLocation } from 'react-router';
import { rutaDetalleCentro, type EstadoNavegacion } from '../logica/rutas.ts';
import type { Celda, Columna, Direccion, Fila } from '../logica/tipos.ts';
import { claseColumna, estadoOrden } from '../logica/tabla.ts';
import { IconoCopiar, IconoOrden } from './Iconos.tsx';
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
  direccion: Direccion;
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
        <IconoOrden aria={e.aria} />
      </button>
    </th>
  );
}

/**
 * Código de un centro como enlace a su detalle (/centros/:codigo). Lleva la misma query (búsqueda y
 * filtros) para que "Volver" regrese a la lista tal como estaba, y recuerda desde qué lista se abrió.
 * Cada enlace lee la dirección por su cuenta: si cambia, solo se redibujan los enlaces (no la tabla).
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

/** Texto del código: enlace al detalle (dentro de la app) o texto simple (en el detalle, o sin React Router). */
function TextoCodigo({ codigo, enlazar, children }: { codigo: string; enlazar: boolean; children: ReactNode }) {
  const conRutas = useInRouterContext();
  if (enlazar && conRutas) return <EnlaceCentro codigo={codigo}>{children}</EnlaceCentro>;
  return <span className="codigo">{children}</span>;
}

/** Contenido de una celda. La del código de centro es un enlace a su detalle y lleva el botón "copiar". */
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
  const contenido = <Resaltado texto={texto} terminos={terminos} />;
  if (columna.campo === 'codigoCentro' && texto) {
    return (
      <span className="celda-codigo">
        <TextoCodigo codigo={texto} enlazar={enlazar}>
          {contenido}
        </TextoCodigo>
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

/**
 * Filas de datos (una por fila del Excel).
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
      {filas.map((fila) => (
        <tr key={fila.id} data-fila={fila.id}>
          {columnas.map((col) => (
            <td key={col.indice} className={claseColumna(col)}>
              <ContenidoCelda
                columna={col}
                celda={fila.celdas[col.indice]}
                terminos={terminosDe(col)}
                alCopiar={alCopiar}
                enlazar={enlazarCodigo}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
});

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
