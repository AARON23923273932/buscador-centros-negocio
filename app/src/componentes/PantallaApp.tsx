// =============================================================================
// PantallaApp — La aplicación: buscador, filtros, tabla, paginación y "Columnas detectadas".
//
//   Excel (useExcel) + lo que eligió la persona (useBusqueda)
//        ──► calcularResultados() ──► paginarResultados() ──► tabla, contador y paginación
//        ──► URL (useGuardarEnUrl)
//
// Rendimiento (con miles de filas, sobre todo en el celular):
//  - Escribir en el buscador o en un filtro "contiene" solo cambia lo que se ve en la caja
//    (useBusqueda.borradores): la tabla, la paginación y "Columnas detectadas" están envueltas en
//    memo() y reciben siempre las mismas props, así que NO se vuelven a dibujar hasta que el filtro
//    se aplica (200 ms después de la última tecla).
//  - Cambiar de página (o de filas por página) no vuelve a buscar ni a ordenar: solo corta otra página.
//  - Esta pantalla también está en memo(): el aviso flotante y el botón ☀️/🌙 (estado de App) no la redibujan.
//  Lo comprueba tests/unit/rendimiento.test.tsx.
// =============================================================================

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Avisar } from '../hooks/useAvisoFlotante.ts';
import { useBusqueda } from '../hooks/useBusqueda.ts';
import { useGuardarEnUrl } from '../hooks/useEstadoUrl.ts';
import { useExcel } from '../hooks/useExcel.ts';
import type { Sesion } from '../logica/auth.ts';
import type { Config } from '../logica/config.ts';
import { TAMANOS_PAGINA } from '../logica/estado-url.ts';
import { contarFiltrosActivos } from '../logica/filtros.ts';
import { copiarTexto } from '../logica/portapapeles.ts';
import type { Columna } from '../logica/tipos.ts';
import {
  calcularResultados,
  estadoControles,
  opcionesDesplegables,
  paginarResultados,
  terminosDeColumna,
  textoActualizado,
  vistaCentroDisponible,
} from '../logica/vista.ts';
import { AvisoColumnas, AvisoError } from './Avisos.tsx';
import { BarraResultados } from './BarraResultados.tsx';
import { Buscador } from './Buscador.tsx';
import { ColumnasDetectadas } from './ColumnasDetectadas.tsx';
import { Filtros } from './Filtros.tsx';
import { IconoActualizar } from './Iconos.tsx';
import { Paginacion } from './Paginacion.tsx';
import { TablaCentros } from './TablaCentros.tsx';
import { TablaOrdenes } from './TablaOrdenes.tsx';

interface Props {
  config: Config;
  /** null en modo demo. */
  sesion: Sesion | null;
  avisar: Avisar;
}

export const PantallaApp = memo(function PantallaApp({ config, sesion, avisar }: Props) {
  const porDefecto = TAMANOS_PAGINA.includes(Number(config.filasPorPagina)) ? Number(config.filasPorPagina) : 50;
  const busqueda = useBusqueda(porDefecto);
  const { estado, setEstado } = busqueda;
  // Opciones de "Filas por página" (las de siempre + la del enlace, si fuera otra).
  const [tamanos] = useState(() => [...new Set([...TAMANOS_PAGINA, estado.tamano])].sort((a, b) => a - b));
  // Centros abiertos en la vista "Por centro" (se conservan al actualizar los datos).
  const [expandidos, setExpandidos] = useState<ReadonlySet<string>>(() => new Set());

  const buscador = useRef<HTMLInputElement>(null);
  const contenedorTabla = useRef<HTMLDivElement>(null);
  const paginacion = useRef<HTMLElement>(null);

  const excel = useExcel({ config, sesion, avisar, alCargar: busqueda.ajustarAColumnas });
  const { datos, cargando } = excel;

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
  useGuardarEnUrl(datos && paginaReal !== undefined ? { ...estado, pagina: paginaReal } : null, porDefecto);

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

  const copiar = useCallback(
    async (texto: string) => {
      const ok = await copiarTexto(texto);
      avisar(ok ? `Código ${texto} copiado` : 'No se pudo copiar. Selecciona el código y usa Ctrl+C.');
    },
    [avisar],
  );

  const alternarCentro = useCallback((clave: string) => {
    setExpandidos((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(clave)) nuevo.delete(clave);
      else nuevo.add(clave);
      return nuevo;
    });
  }, []);

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

  // ---- Textos ----
  let actualizado = 'Cargando datos del Excel…';
  // ('error' o 'reintentando': la última lectura falló; mientras se reintenta, el texto no cambia.)
  if (!datos && excel.sinDatos !== 'cargando') actualizado = 'No se pudieron cargar los datos.';
  else if (excel.ultimaConsulta) actualizado = textoActualizado(excel.ultimaConsulta, excel.archivo?.modificado, config.autoActualizarMinutos);

  // Misma función mientras no cambien los resultados (si no, memo() de las tablas no serviría).
  const terminosDe = useCallback(
    (columna: Pick<Columna, 'campo'>) => (resultados ? terminosDeColumna(resultados.terminos, resultados.porCampo, columna) : []),
    [resultados],
  );

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
    <section id="pantalla-app">
      <div id="aviso-demo" className="aviso aviso-info" hidden={config.modo !== 'demo'}>
        <strong>Modo demostración:</strong> estás viendo datos <strong>ficticios</strong> de ejemplo, sin inicio de sesión.
      </div>

      <div className="barra-estado">
        <p id="texto-actualizado" className="texto-actualizado" aria-live="polite">
          {actualizado}
        </p>
        {/* aria-disabled (y no "disabled") para que el botón no pierda el foco del teclado mientras carga. */}
        <button
          type="button"
          id="btn-actualizar"
          className={`btn btn-secundario${cargando ? ' girando' : ''}`}
          aria-disabled={cargando}
          onClick={() => void excel.cargar('manual')}
        >
          <IconoActualizar />
          <span id="texto-btn-actualizar">{cargando ? 'Actualizando…' : 'Actualizar'}</span>
        </button>
      </div>

      <AvisoError error={excel.error} />
      <AvisoColumnas datos={datos} />

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

      <details className="detalles-columnas">
        <summary>Columnas detectadas en el Excel</summary>
        <div id="info-columnas" className="info-columnas">
          {datos && <ColumnasDetectadas datos={datos} archivo={excel.archivo} />}
        </div>
      </details>

      <p className="pie">La información se lee del Excel que llena el bot del ERP. Esta página es solo de consulta (no modifica el Excel).</p>
    </section>
  );
});
