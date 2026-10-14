// =============================================================================
// DetalleCentro — Ruta /centros/:codigo: un centro de negocio con TODAS sus órdenes.
//
//   código (de la dirección) + Excel (de PantallaApp) ──► buscarCentro() ──► ficha + tabla de sus filas
//
// Se llega con el enlace del código en las listas (o con un enlace compartido). La dirección conserva la
// query de la lista (?q=…&cliente=…): "Volver a la lista" regresa a la lista con los mismos filtros.
// Los filtros de la lista NO se aplican aquí: se ven todas las órdenes del centro.
// =============================================================================

import { useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { buscarCentro, estadosDeCentro } from '../logica/centro.ts';
import { numero } from '../logica/formato.ts';
import { codigoDeRuta, rutaVolver, type EstadoNavegacion } from '../logica/rutas.ts';
import { claseColumna } from '../logica/tabla.ts';
import { ContenidoCelda, FilasDatos } from './Celdas.tsx';
import { IconoVolver } from './Iconos.tsx';
import { useContextoApp } from './PantallaApp.tsx';

/** En el detalle no se resalta nada (no es una búsqueda). Función fija: memo() de FilasDatos sirve. */
const sinTerminos = (): readonly string[] => [];

/** "Volver a la lista": a la lista desde la que se abrió (o a /centros), con la misma búsqueda y filtros. */
function VolverALista() {
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const destino = { pathname: rutaVolver(ubicacion.state), search: ubicacion.search };
  // Si se llegó desde la lista con el enlace del código, "Volver" es como el botón atrás del navegador:
  // regresa a esa misma entrada del historial (y el navegador recupera hasta dónde se había bajado).
  const vieneDeLaLista = typeof (ubicacion.state as EstadoNavegacion | null)?.desde === 'string';
  const alHacerClic = (ev: MouseEvent<HTMLAnchorElement>) => {
    const posicion = (history.state as { idx?: unknown } | null)?.idx;
    const conTeclaEspecial = ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey;
    if (vieneDeLaLista && !conTeclaEspecial && typeof posicion === 'number' && posicion > 0) {
      ev.preventDefault();
      void navegar(-1);
    }
  };
  return (
    <Link id="btn-volver" className="btn btn-secundario btn-volver" to={destino} onClick={alHacerClic}>
      <IconoVolver />
      Volver a la lista
    </Link>
  );
}

export function DetalleCentro() {
  const { excel, copiar, anotarCentroAbierto } = useContextoApp();
  // El código sale de la dirección tal cual (decodificada una vez): useParams() convertiría un "%2F" escrito en
  // el código en "/" (ver codigoDeRuta). useParams() queda de respaldo.
  const { pathname } = useLocation();
  const { codigo: codigoParametro = '' } = useParams();
  const codigo = codigoDeRuta(pathname) ?? codigoParametro;
  const { datos } = excel;
  const grupo = useMemo(() => (datos ? buscarCentro(datos.filas, codigo) : null), [datos, codigo]);
  const estados = useMemo(() => (grupo ? estadosDeCentro(grupo) : []), [grupo]);
  const conEstado = !!datos && 'estado' in datos.mapa;

  // Al abrir el detalle: arriba de la página y el foco en el título (lo anuncia el lector de pantalla).
  // Se anota el centro: al volver a la lista, el foco irá a su enlace (ver VistaLista).
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    titulo.current?.focus({ preventScroll: true });
    anotarCentroAbierto({ codigo, indice: -1 });
  }, [codigo, anotarCentroAbierto]);

  let contenido;
  if (!datos) {
    contenido =
      excel.sinDatos === 'error' ? (
        <div className="estado-tabla estado-error tarjeta">No hay datos para mostrar. Revisa el mensaje de arriba.</div>
      ) : (
        <div className="estado-tabla tarjeta" aria-busy="true">
          <span className="spinner" aria-hidden="true" /> Cargando datos del Excel…
        </div>
      );
  } else if (!grupo) {
    contenido = (
      <div id="centro-no-encontrado" className="aviso aviso-advertencia" role="status">
        <strong>No se encontró el centro de negocio “{codigo}” en el Excel.</strong> Revisa el código (puede haber cambiado o
        estar mal escrito en el enlace) o vuelve a la lista para buscarlo.
      </div>
    );
  } else {
    contenido = (
      <>
        <dl id="ficha-centro" className="ficha-centro tarjeta">
          <div className="ficha-dato">
            <dt>Código</dt>
            <dd>
              <ContenidoCelda columna={{ campo: 'codigoCentro' }} celda={{ t: grupo.codigo }} terminos={[]} alCopiar={copiar} enlazar={false} />
            </dd>
          </div>
          <div className="ficha-dato ficha-ancha">
            <dt>Descripción</dt>
            <dd>{grupo.descripcion || '—'}</dd>
          </div>
          <div className="ficha-dato ficha-ancha">
            <dt>{grupo.clientes.length > 1 ? 'Clientes' : 'Cliente'}</dt>
            <dd>{grupo.clientes.join(', ') || '—'}</dd>
          </div>
          {conEstado && (
            <div className="ficha-dato">
              <dt>{estados.length > 1 ? 'Estados' : 'Estado'}</dt>
              <dd>{estados.join(', ') || '—'}</dd>
            </div>
          )}
          <div className="ficha-dato">
            <dt>N° de órdenes</dt>
            <dd>
              <span className="insignia">{numero(grupo.ordenes)}</span>
            </dd>
          </div>
        </dl>

        <h3 className="subtitulo-detalle" id="titulo-ordenes-centro">
          Órdenes del centro{' '}
          <span className="tenue">
            ({numero(grupo.filas.length)} {grupo.filas.length === 1 ? 'fila' : 'filas'} del Excel)
          </span>
        </h3>
        <div id="contenedor-detalle" className="contenedor-tabla contenedor-detalle" role="region" aria-labelledby="titulo-ordenes-centro" tabIndex={0}>
          <table className="tabla tabla-detalle" id="tabla-detalle">
            <caption className="solo-lectores">Órdenes del centro {grupo.codigo}</caption>
            <thead>
              <tr>
                {datos.columnas.map((c) => (
                  <th key={c.indice} scope="col" className={claseColumna(c)}>
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <FilasDatos columnas={datos.columnas} filas={grupo.filas} terminosDe={sinTerminos} alCopiar={copiar} enlazarCodigo={false} />
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <section id="detalle-centro" className="detalle-centro" aria-labelledby="titulo-detalle">
      <div className="barra-detalle">
        <VolverALista />
      </div>
      <h2 id="titulo-detalle" ref={titulo} tabIndex={-1}>
        Centro de negocio <span className="codigo">{grupo?.codigo || codigo}</span>
      </h2>
      {contenido}
    </section>
  );
}
