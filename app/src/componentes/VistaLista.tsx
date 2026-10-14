// =============================================================================
// VistaLista — Rutas /ordenes y /centros: buscador, filtros, tabla y paginación.
//
//   Excel + lo que eligió la persona (ambos vienen de PantallaApp: useContextoApp)
//        ──► calcularResultados() ──► paginarResultados() ──► tabla, contador y paginación
//        ──► query de la dirección (useGuardarEnUrl)
//
// La vista ("Por orden" / "Por centro") es la ruta: el selector navega entre /ordenes y /centros
// conservando la búsqueda y los filtros (useBusqueda.cambiarVista).
//
// Rendimiento (con miles de filas, sobre todo en el celular):
//  - Escribir en el buscador o en un filtro "contiene" solo cambia lo que se ve en la caja
//    (useBusqueda.borradores): la tabla, la paginación y "Columnas detectadas" están envueltas en
//    memo() y reciben siempre las mismas props, así que NO se vuelven a dibujar hasta que el filtro
//    se aplica (200 ms después de la última tecla).
//  - Cambiar de página (o de filas por página) no vuelve a buscar ni a ordenar: solo corta otra página.
//  Lo comprueba tests/unit/rendimiento.test.tsx.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useGuardarEnUrl } from '../hooks/useEstadoUrl.ts';
import { TAMANOS_PAGINA } from '../logica/estado-url.ts';
import { contarFiltrosActivos } from '../logica/filtros.ts';
import { destinoCompatible, rutaDeVista, vistaDeRuta, type Destino } from '../logica/rutas.ts';
import type { Columna } from '../logica/tipos.ts';
import { calcularResultados, estadoControles, opcionesDesplegables, paginarResultados, terminosDeColumna, vistaCentroDisponible } from '../logica/vista.ts';
import { BarraResultados } from './BarraResultados.tsx';
import { Buscador } from './Buscador.tsx';
import { Filtros } from './Filtros.tsx';
import { Paginacion } from './Paginacion.tsx';
import { useContextoApp } from './PantallaApp.tsx';
import { TablaCentros } from './TablaCentros.tsx';
import { TablaOrdenes } from './TablaOrdenes.tsx';

export function VistaLista() {
  const { porDefecto, excel, busqueda, expandidos, alternarCentro, copiar, avisar } = useContextoApp();
  const ubicacion = useLocation();
  const { estado, setEstado } = busqueda;
  const { datos, cargando } = excel;

  // ¿Hay que ir a otra ruta? (enlace viejo con ?vista=…, o "Por centro" sin columnas de centro en el Excel)
  let redirigir: Destino | null = destinoCompatible(ubicacion.pathname, ubicacion.search);
  if (!redirigir && estado.vista !== vistaDeRuta(ubicacion.pathname)) {
    redirigir = { pathname: rutaDeVista(estado.vista), search: ubicacion.search };
  }

  // Opciones de "Filas por página" (las de siempre + la del enlace, si fuera otra).
  const tamanos = useMemo(() => [...new Set([...TAMANOS_PAGINA, estado.tamano])].sort((a, b) => a - b), [estado.tamano]);

  const buscador = useRef<HTMLInputElement>(null);
  const contenedorTabla = useRef<HTMLDivElement>(null);
  const paginacion = useRef<HTMLElement>(null);

  // ---- Lo que se ve (se recalcula solo cuando cambian los datos o lo elegido) ----
  // 1) Buscar, filtrar, ordenar y agrupar: solo si cambian los datos, la búsqueda, los filtros, la vista o el orden.
  const { q, cliente, codigo, descripcion, orden, tipo, estado: filtroEstado, vista: tipoVista, ordenarPor, direccion } = estado;
  const resultados = useMemo(
    () =>
      datos
        ? calcularResultados(
            datos,
            { q, cliente, codigo, descripcion, orden, tipo, estado: filtroEstado, vista: tipoVista, ordenarPor, direccion },
            excel.totalCentros,
          )
        : null,
    [datos, q, cliente, codigo, descripcion, orden, tipo, filtroEstado, tipoVista, ordenarPor, direccion, excel.totalCentros],
  );
  // 2) Cortar la página: lo único que cambia al pasar de página o al elegir otras "Filas por página".
  const vista = useMemo(
    () => (resultados ? paginarResultados(resultados, estado.pagina, estado.tamano) : null),
    [resultados, estado.pagina, estado.tamano],
  );
  const controles = useMemo(() => estadoControles(datos), [datos]);
  const opciones = useMemo(() => opcionesDesplegables(datos), [datos]);
  const activos = contarFiltrosActivos(estado);

  // Si la página pedida ya no existe (ej. menos resultados), se corrige (también en la URL).
  const paginaReal = vista?.pagina.pagina;
  useEffect(() => {
    if (paginaReal !== undefined && paginaReal !== estado.pagina) setEstado((e) => ({ ...e, pagina: paginaReal }));
  }, [paginaReal, estado.pagina, setEstado]);
  // La búsqueda queda en la query de la dirección (no mientras se va a otra ruta: no se escribe encima).
  useGuardarEnUrl(!redirigir && datos && paginaReal !== undefined ? { ...estado, pagina: paginaReal } : null, porDefecto, busqueda.marcarEscrita);

  // ---- Acciones ----
  const limpiarFiltros = () => {
    busqueda.limpiar();
    // El botón "Limpiar filtros" queda desactivado: el foco pasa al buscador para no perder el lugar.
    buscador.current?.focus();
    avisar('Filtros limpiados');
  };

  const borrarBusqueda = () => {
    busqueda.escribir('q', '');
    busqueda.aplicarYa('q');
    buscador.current?.focus();
  };

  const { irAPagina: irAPaginaBusqueda } = busqueda;
  const irAPagina = useCallback(
    (pagina: number) => {
      irAPaginaBusqueda(pagina);
      if (contenedorTabla.current) contenedorTabla.current.scrollTop = 0;
    },
    [irAPaginaBusqueda],
  );

  // "Saltar a la paginación": con teclado, evita pasar por todos los botones de la tabla.
  const saltarAPaginacion = () => {
    const destino =
      paginacion.current?.querySelector<HTMLElement>('.btn-pagina:not([disabled])') ||
      document.querySelector<HTMLElement>('.pagina-actual');
    if (destino) {
      if (!destino.matches('button')) destino.tabIndex = -1;
      destino.focus();
    } else {
      buscador.current?.focus();
    }
  };

  const exportar = async () => {
    if (!datos || !vista?.filas.length) return;
    const { exportarExcel } = await import('../logica/exportar.ts');
    const nombre = exportarExcel(datos.columnas, vista.filas, vista.grupos);
    avisar(`Se descargó ${nombre} (${vista.filas.length.toLocaleString('es-PE')} filas)`);
  };

  // Atajo: "/" lleva al buscador.
  useEffect(() => {
    const alPulsar = (ev: KeyboardEvent) => {
      if (ev.key !== '/' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const t = ev.target;
      if (t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      ev.preventDefault();
      buscador.current?.focus();
      buscador.current?.select();
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, []);

  // Misma función mientras no cambien los resultados (si no, memo() de las tablas no serviría).
  const terminosDe = useCallback(
    (columna: Pick<Columna, 'campo'>) => (resultados ? terminosDeColumna(resultados.terminos, resultados.porCampo, columna) : []),
    [resultados],
  );

  if (redirigir) return <Navigate to={redirigir} replace />;

  let tabla;
  if (datos && vista) {
    tabla =
      vista.tipo === 'centro' ? (
        <TablaCentros
          grupos={vista.pagina.items}
          columnas={datos.columnas}
          terminos={vista.terminos}
          terminosDe={terminosDe}
          expandidos={expandidos}
          ordenarPor={estado.ordenarPor}
          direccion={estado.direccion}
          hayDatos={datos.filas.length > 0}
          alOrdenar={busqueda.ordenar}
          alAlternar={alternarCentro}
          alCopiar={copiar}
        />
      ) : (
        <TablaOrdenes
          columnas={datos.columnas}
          filas={vista.pagina.items}
          terminosDe={terminosDe}
          ordenarPor={estado.ordenarPor}
          direccion={estado.direccion}
          hayDatos={datos.filas.length > 0}
          alOrdenar={busqueda.ordenar}
          alCopiar={copiar}
        />
      );
  } else if (excel.sinDatos === 'error') {
    tabla = <div className="estado-tabla estado-error">No hay datos para mostrar. Revisa el mensaje de arriba.</div>;
  } else {
    tabla = (
      <div className="estado-tabla">
        <span className="spinner" aria-hidden="true" /> Cargando datos del Excel…
      </div>
    );
  }

  return (
    <>
      <Buscador
        valor={busqueda.borradores.q}
        alEscribir={(valor) => busqueda.escribir('q', valor)}
        alEnviar={() => busqueda.aplicarYa('q')}
        alBorrar={borrarBusqueda}
        campoRef={buscador}
      />

      <Filtros
        estado={estado}
        borradores={busqueda.borradores}
        controles={controles}
        opciones={opciones}
        mostrarTipo={datos ? controles.tipo.disponible : false}
        mostrarEstado={datos ? controles.estado.disponible : false}
        activos={datos ? activos : null}
        limpiarDesactivado={datos ? activos === 0 && !estado.q : false}
        alEscribir={busqueda.escribir}
        alAplicarYa={busqueda.aplicarYa}
        alElegir={busqueda.elegir}
        alLimpiar={limpiarFiltros}
      />

      <BarraResultados
        vista={estado.vista}
        vistaCentroDisponible={vistaCentroDisponible(datos)}
        contador={vista?.contador ?? ''}
        tamano={estado.tamano}
        tamanos={tamanos}
        exportarDesactivado={!vista || vista.filas.length === 0}
        alCambiarVista={busqueda.cambiarVista}
        alCambiarTamano={busqueda.cambiarTamano}
        alExportar={() => void exportar()}
      />

      {/* Solo se ve al llegar con la tecla Tab: evita recorrer todos los botones de la tabla. */}
      <button type="button" id="btn-saltar-paginacion" className="saltar-local" onClick={saltarAPaginacion}>
        Saltar a la paginación
      </button>

      <div
        id="contenedor-tabla"
        ref={contenedorTabla}
        className="contenedor-tabla"
        role="region"
        aria-label="Resultados"
        tabIndex={0}
        aria-busy={cargando}
      >
        {tabla}
      </div>

      <Paginacion pagina={vista?.pagina ?? null} alIrA={irAPagina} navRef={paginacion} />
    </>
  );
}
