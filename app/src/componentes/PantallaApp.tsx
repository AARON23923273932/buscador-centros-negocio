// =============================================================================
// PantallaApp — Lo que comparten todas las rutas de la aplicación (es el "layout" de React Router):
// el Excel (useExcel), lo que eligió la persona (useBusqueda), los centros abiertos, la barra
// "Datos actualizados… [Actualizar]", los avisos y "Columnas detectadas". En el medio (<Outlet />)
// va la ruta: la lista (/ordenes, /centros → VistaLista.tsx) o el detalle de un centro
// (/centros/:codigo → DetalleCentro.tsx). Ver las rutas en RutasApp.tsx.
//
// Como esta pantalla no cambia al pasar de una ruta a otra, el Excel se descarga UNA vez y la búsqueda,
// los filtros y los centros abiertos se conservan al ir al detalle y volver.
//
// Rendimiento: está en memo() (el aviso flotante y el botón ☀️/🌙, que son estado de App, no la redibujan)
// y lo que reciben las rutas (useContextoApp) solo cambia cuando cambia algo de lo de arriba.
// Lo comprueba tests/unit/rendimiento.test.tsx.
// =============================================================================

import { memo, useCallback, useMemo, useState } from 'react';
import { Outlet, useOutletContext } from 'react-router';
import type { Avisar } from '../hooks/useAvisoFlotante.ts';
import { useBusqueda, type Busqueda } from '../hooks/useBusqueda.ts';
import { useExcel, type Excel } from '../hooks/useExcel.ts';
import type { Sesion } from '../logica/auth.ts';
import type { Config } from '../logica/config.ts';
import { TAMANOS_PAGINA } from '../logica/estado-url.ts';
import { copiarTexto } from '../logica/portapapeles.ts';
import { textoActualizado } from '../logica/vista.ts';
import { AvisoColumnas, AvisoError } from './Avisos.tsx';
import type { AlCopiar } from './Celdas.tsx';
import { ColumnasDetectadas } from './ColumnasDetectadas.tsx';
import { IconoActualizar } from './Iconos.tsx';

interface Props {
  config: Config;
  /** null en modo demo. */
  sesion: Sesion | null;
  avisar: Avisar;
}

/** Lo que PantallaApp les pasa a las rutas (lista y detalle). */
export interface ContextoApp {
  config: Config;
  /** Filas por página por defecto (config.filasPorPagina, si es una de las permitidas). */
  porDefecto: number;
  excel: Excel;
  busqueda: Busqueda;
  /** Centros abiertos en la vista "Por centro" (se conservan al actualizar los datos y al volver del detalle). */
  expandidos: ReadonlySet<string>;
  alternarCentro: (clave: string) => void;
  copiar: AlCopiar;
  avisar: Avisar;
}

/** Para las rutas que van dentro de PantallaApp (VistaLista, DetalleCentro). */
export function useContextoApp(): ContextoApp {
  return useOutletContext<ContextoApp>();
}

export const PantallaApp = memo(function PantallaApp({ config, sesion, avisar }: Props) {
  const porDefecto = TAMANOS_PAGINA.includes(Number(config.filasPorPagina)) ? Number(config.filasPorPagina) : 50;
  const busqueda = useBusqueda(porDefecto);
  const [expandidos, setExpandidos] = useState<ReadonlySet<string>>(() => new Set());

  const excel = useExcel({ config, sesion, avisar, alCargar: busqueda.ajustarAColumnas });
  const { datos, cargando } = excel;

  const copiar = useCallback(
    (texto: string) =>
      void copiarTexto(texto).then((ok) => avisar(ok ? `Código ${texto} copiado` : 'No se pudo copiar. Selecciona el código y usa Ctrl+C.')),
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

  const contexto = useMemo<ContextoApp>(
    () => ({ config, porDefecto, excel, busqueda, expandidos, alternarCentro, copiar, avisar }),
    [config, porDefecto, excel, busqueda, expandidos, alternarCentro, copiar, avisar],
  );

  // ---- Textos ----
  let actualizado = 'Cargando datos del Excel…';
  // ('error' o 'reintentando': la última lectura falló; mientras se reintenta, el texto no cambia.)
  if (!datos && excel.sinDatos !== 'cargando') actualizado = 'No se pudieron cargar los datos.';
  else if (excel.ultimaConsulta) actualizado = textoActualizado(excel.ultimaConsulta, excel.archivo?.modificado, config.autoActualizarMinutos);

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

      {/* La ruta: lista (/ordenes, /centros) o detalle de un centro (/centros/:codigo). */}
      <Outlet context={contexto} />

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
