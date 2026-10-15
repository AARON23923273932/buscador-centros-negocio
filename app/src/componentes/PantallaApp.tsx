// =============================================================================
// PantallaApp — Lo que comparten todas las rutas de la aplicación (es el "layout" de React Router):
// el Excel (useExcel), lo que eligió la persona (useBusqueda), los centros abiertos, la barra
// "Datos actualizados… [Actualizar]", los avisos y "Columnas detectadas" (se abre con un botón). En el medio (<Outlet />)
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

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Outlet, useOutletContext } from 'react-router';
import { ChevronRightIcon, InfoIcon } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Avisar } from '../hooks/useAvisoFlotante.ts';
import { useBusqueda, type Busqueda } from '../hooks/useBusqueda.ts';
import { useExcel, type Excel } from '../hooks/useExcel.ts';
import type { Sesion } from '../logica/auth.ts';
import type { Config } from '../logica/config.ts';
import { mismoCodigo } from '../logica/centro.ts';
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
  /**
   * El centro cuyo detalle se abrió: la lista anota el enlace que se usó (código + posición entre los enlaces
   * de la tabla) y el detalle anota su código (posición -1, si se abrió con un enlace directo). Al volver, la
   * lista lo retoma (una sola vez) y le devuelve el foco a ese enlace, o al buscador si ya no está en la página.
   * Así quien usa el teclado sigue donde estaba.
   */
  anotarCentroAbierto: (abierto: CentroAbierto) => void;
  /** El enlace anotado (y lo borra), o null si no se abrió ningún detalle desde la lista. */
  retomarCentroAbierto: () => CentroAbierto | null;
  copiar: AlCopiar;
  avisar: Avisar;
}

/** Qué enlace de la lista abrió el detalle (ver ContextoApp.anotarCentroAbierto). */
export interface CentroAbierto {
  codigo: string;
  /**
   * Posición del enlace entre los enlaces de código de la tabla (el mismo código puede estar en varias filas);
   * -1 = no se sabe (lo anotó el detalle).
   */
  indice: number;
}

/** Para las rutas que van dentro de PantallaApp (VistaLista, DetalleCentro). */
export function useContextoApp(): ContextoApp {
  return useOutletContext<ContextoApp>();
}

export const PantallaApp = memo(function PantallaApp({ config, sesion, avisar }: Props) {
  const porDefecto = TAMANOS_PAGINA.includes(Number(config.filasPorPagina)) ? Number(config.filasPorPagina) : 50;
  const busqueda = useBusqueda(porDefecto);
  const [expandidos, setExpandidos] = useState<ReadonlySet<string>>(() => new Set());
  const centroAbierto = useRef<CentroAbierto | null>(null);
  const anotarCentroAbierto = useCallback((abierto: CentroAbierto) => {
    // El detalle (posición -1) no reemplaza el enlace exacto que anotó la lista para ese mismo centro.
    if (abierto.indice < 0 && centroAbierto.current && mismoCodigo(centroAbierto.current.codigo, abierto.codigo)) return;
    centroAbierto.current = abierto;
  }, []);
  const retomarCentroAbierto = useCallback(() => {
    const abierto = centroAbierto.current;
    centroAbierto.current = null;
    return abierto;
  }, []);

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
    () => ({ config, porDefecto, excel, busqueda, expandidos, alternarCentro, anotarCentroAbierto, retomarCentroAbierto, copiar, avisar }),
    [config, porDefecto, excel, busqueda, expandidos, alternarCentro, anotarCentroAbierto, retomarCentroAbierto, copiar, avisar],
  );

  // ---- Textos ----
  let actualizado = 'Cargando datos del Excel…';
  // ('error' o 'reintentando': la última lectura falló; mientras se reintenta, el texto no cambia.)
  if (!datos && excel.sinDatos !== 'cargando') actualizado = 'No se pudieron cargar los datos.';
  else if (excel.ultimaConsulta) actualizado = textoActualizado(excel.ultimaConsulta, excel.archivo?.modificado, config.autoActualizarMinutos);

  return (
    <section id="pantalla-app">
      <Alert id="aviso-demo" role="note" className="mb-3" hidden={config.modo !== 'demo'}>
        <InfoIcon aria-hidden="true" />
        <div>
          <strong>Modo demostración:</strong> estás viendo datos <strong>ficticios</strong> de ejemplo, sin inicio de sesión.
        </div>
      </Alert>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 print:hidden">
        <p id="texto-actualizado" className="m-0 text-sm text-muted-foreground" aria-live="polite">
          {actualizado}
        </p>
        {/* aria-disabled (y no "disabled") para que el botón no pierda el foco del teclado mientras carga. */}
        <Button type="button" id="btn-actualizar" variant="outline" aria-disabled={cargando} onClick={() => void excel.cargar('manual')}>
          <IconoActualizar girando={cargando} />
          <span id="texto-btn-actualizar">{cargando ? 'Actualizando…' : 'Actualizar'}</span>
        </Button>
      </div>

      <AvisoError error={excel.error} />
      <AvisoColumnas datos={datos} />

      {/* La ruta: lista (/ordenes, /centros) o detalle de un centro (/centros/:codigo). */}
      <Outlet context={contexto} />

      {/* Se abre y se cierra con un botón (Collapsible de shadcn/ui: aria-expanded y aria-controls). */}
      <Collapsible className="mt-4 mb-2 text-sm print:hidden">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="group/columnas -ml-2.5 text-muted-foreground">
            <ChevronRightIcon aria-hidden="true" className="size-4 transition-transform group-data-[state=open]/columnas:rotate-90" />
            Columnas detectadas en el Excel
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div id="info-columnas" className="pt-1 [&_p]:my-2 [&_p]:[overflow-wrap:anywhere]">
            {datos && <ColumnasDetectadas datos={datos} archivo={excel.archivo} />}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <p className="mt-3 mb-6 text-[0.82rem] text-muted-foreground">
        La información se lee del Excel que llena el bot del ERP. Esta página es solo de consulta (no modifica el Excel).
      </p>
    </section>
  );
});
