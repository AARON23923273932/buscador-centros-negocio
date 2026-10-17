import { useCallback, useEffect, useMemo, useRef, type MouseEvent } from 'react';
import { Navigate, useLocation } from 'react-router';
import { CircleAlertIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGuardarEnUrl } from '../hooks/useEstadoUrl.ts';
import { mismoCodigo } from '../logica/centro.ts';
import { TAMANOS_PAGINA } from '../logica/estado-url.ts';
import { contarFiltrosActivos } from '../logica/filtros.ts';
import { destinoCompatible, rutaDeVista, vistaDeRuta, type Destino } from '../logica/rutas.ts';
import type { Columna } from '../logica/tipos.ts';
import { calcularResultados, estadoControles, opcionesDesplegables, paginarResultados, terminosDeColumna, vistaCentroDisponible } from '../logica/vista.ts';
import { BarraResultados } from './BarraResultados.tsx';
import { Buscador } from './Buscador.tsx';
import { CajaTabla, MensajeTabla } from './Celdas.tsx';
import { Filtros } from './Filtros.tsx';
import { IndicadorCarga } from './Iconos.tsx';
import { Paginacion } from './Paginacion.tsx';
import { useContextoApp } from './PantallaApp.tsx';
import { TablaCentros } from './TablaCentros.tsx';
import { TablaOrdenes } from './TablaOrdenes.tsx';

export function VistaLista() {
  const { porDefecto, excel, busqueda, expandidos, alternarCentro, anotarCentroAbierto, retomarCentroAbierto, copiar, avisar } = useContextoApp();
  const ubicacion = useLocation();
  const { estado, setEstado } = busqueda;
  const { datos, cargando } = excel;

  let redirigir: Destino | null = destinoCompatible(ubicacion.pathname, ubicacion.search);
  if (!redirigir && estado.vista !== vistaDeRuta(ubicacion.pathname)) {
    redirigir = { pathname: rutaDeVista(estado.vista), search: ubicacion.search };
  }

  const tamanos = useMemo(() => [...new Set([...TAMANOS_PAGINA, estado.tamano])].sort((a, b) => a - b), [estado.tamano]);

  const buscador = useRef<HTMLInputElement>(null);
  const contenedorTabla = useRef<HTMLDivElement>(null);
  const paginacion = useRef<HTMLElement>(null);

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
  const vista = useMemo(
    () => (resultados ? paginarResultados(resultados, estado.pagina, estado.tamano) : null),
    [resultados, estado.pagina, estado.tamano],
  );
  const controles = useMemo(() => estadoControles(datos), [datos]);
  const opciones = useMemo(() => opcionesDesplegables(datos), [datos]);
  const activos = contarFiltrosActivos(estado);

  const paginaReal = vista?.pagina.pagina;
  useEffect(() => {
    if (paginaReal !== undefined && paginaReal !== estado.pagina) setEstado((e) => ({ ...e, pagina: paginaReal }));
  }, [paginaReal, estado.pagina, setEstado]);
  useGuardarEnUrl(!redirigir && datos && paginaReal !== undefined ? { ...estado, pagina: paginaReal } : null, porDefecto, busqueda.marcarEscrita);

  const hayTabla = !!vista;
  const redirigiendo = !!redirigir;
  useEffect(() => {
    if (!hayTabla || redirigiendo) return;
    const abierto = retomarCentroAbierto();
    if (!abierto) return;
    const enlaces = [...(contenedorTabla.current?.querySelectorAll<HTMLAnchorElement>('a.enlace-codigo') ?? [])];
    const delCentro = (a: HTMLAnchorElement | undefined) => !!a && mismoCodigo(a.textContent ?? '', abierto.codigo);
    const mismo = enlaces[abierto.indice];
    const enlace = delCentro(mismo) ? mismo : enlaces.find(delCentro);
    (enlace ?? buscador.current)?.focus();
  }, [retomarCentroAbierto, hayTabla, redirigiendo]);

  const recordarEnlace = (ev: MouseEvent<HTMLDivElement>) => {
    if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || !(ev.target instanceof Element)) return;
    const enlace = ev.target.closest('a.enlace-codigo');
    if (!enlace) return;
    const enlaces = [...ev.currentTarget.querySelectorAll('a.enlace-codigo')];
    anotarCentroAbierto({ codigo: enlace.textContent ?? '', indice: enlaces.indexOf(enlace) });
  };

  const limpiarFiltros = () => {
    busqueda.limpiar();
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
    let modulo: typeof import('../logica/exportar.ts');
    try {
      modulo = await import('../logica/exportar.ts');
    } catch (e) {
      console.error(e);
      avisar('No se pudo exportar: hay una versión nueva de la app. Recarga la página (F5) y vuelve a intentarlo.');
      return;
    }
    const nombre = modulo.exportarExcel(datos.columnas, vista.filas, vista.grupos);
    avisar(`Se descargó ${nombre} (${vista.filas.length.toLocaleString('es-PE')} filas)`);
  };

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
    tabla = (
      <MensajeTabla>
        <CircleAlertIcon aria-hidden="true" className="size-[18px] shrink-0" />
        No hay datos para mostrar. Revisa el mensaje de arriba.
      </MensajeTabla>
    );
  } else {
    tabla = (
      <MensajeTabla>
        <IndicadorCarga />
        Cargando datos del Excel…
      </MensajeTabla>
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

      <Button
        type="button"
        id="btn-saltar-paginacion"
        className="sr-only focus:not-sr-only focus:mb-2 focus:h-9 focus:px-2.5"
        onClick={saltarAPaginacion}
      >
        Saltar a la paginación
      </Button>

      <CajaTabla id="contenedor-tabla" ref={contenedorTabla} aria-label="Resultados" aria-busy={cargando} onClickCapture={recordarEnlace}>
        {tabla}
      </CajaTabla>

      <Paginacion pagina={vista?.pagina ?? null} alIrA={irAPagina} navRef={paginacion} />
    </>
  );
}
