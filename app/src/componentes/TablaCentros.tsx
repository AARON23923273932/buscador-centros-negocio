// Tabla "Por centro de negocio": una fila por centro que se abre para ver sus órdenes.
// memo(): no se vuelve a dibujar si sus props no cambian (ej. mientras se escribe en el buscador).
import { Fragment, memo, type MouseEvent } from 'react';
import { numero } from '../logica/formato.ts';
import { claseColumna } from '../logica/tabla.ts';
import type { Columna, Direccion, Grupo } from '../logica/tipos.ts';
import { ContenidoCelda, EncabezadoOrdenable, FilasDatos, FilaSinResultados, type AlCopiar } from './Celdas.tsx';
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
    <table className="tabla tabla-centros" id="tabla-resultados">
      <caption className="solo-lectores">Centros de negocio. Pulsa la flecha de un centro para ver sus órdenes.</caption>
      <thead>
        <tr>
          <th scope="col" className="col-expandir">
            <span className="solo-lectores">Ver órdenes</span>
          </th>
          <EncabezadoOrdenable clave="codigo" titulo="Código" {...orden} />
          <EncabezadoOrdenable clave="descripcion" titulo="Descripción" clase="ancha" {...orden} />
          <EncabezadoOrdenable clave="cliente" titulo="Cliente(s)" {...orden} />
          <EncabezadoOrdenable clave="ordenes" titulo="N° de órdenes" clase="num" {...orden} />
        </tr>
      </thead>
      <tbody>
        {!grupos.length && <FilaSinResultados columnas={5} hayDatos={hayDatos} />}
        {grupos.map((g, i) => {
          const abierto = expandidos.has(g.clave);
          const idDetalle = `detalle-centro-${i}`;
          const nombre = g.codigo || g.descripcion || 'sin código';
          return (
            <Fragment key={g.clave}>
              <tr className={`fila-centro${abierto ? ' abierta' : ''}`} data-grupo={g.clave} onClick={(ev) => alHacerClic(ev, g.clave)}>
                <td className="col-expandir">
                  <button
                    type="button"
                    className="btn-expandir"
                    data-grupo={g.clave}
                    aria-expanded={abierto}
                    aria-controls={abierto ? idDetalle : undefined}
                  >
                    <IconoFlecha />
                    <span className="solo-lectores">
                      {abierto ? 'Ocultar' : 'Ver'} órdenes de {nombre}
                    </span>
                  </button>
                </td>
                <td>
                  <ContenidoCelda columna={colCodigo} celda={{ t: g.codigo }} terminos={terminosDe(colCodigo)} alCopiar={alCopiar} />
                </td>
                <td className="ancha">
                  <Resaltado texto={g.descripcion} terminos={terminosDe(colDescripcion)} />
                </td>
                <td>
                  <Resaltado texto={g.clientes.join(', ')} terminos={terminos} />
                </td>
                <td className="num">
                  <span className="insignia">{numero(g.ordenes)}</span>
                </td>
              </tr>
              {abierto && (
                <tr className="fila-detalle" id={idDetalle}>
                  <td colSpan={5}>
                    <div className="detalle-contenedor">
                      <table className="tabla tabla-anidada">
                        <caption className="solo-lectores">Órdenes del centro {nombre}</caption>
                        <thead>
                          <tr>
                            {columnas.map((c) => (
                              <th key={c.indice} scope="col" className={claseColumna(c)}>
                                {c.titulo}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <FilasDatos columnas={columnas} filas={g.filas} terminosDe={terminosDe} alCopiar={alCopiar} />
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
});
