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
  sesion: Sesion | null;
  avisar: Avisar;
}

export interface ContextoApp {
  config: Config;
  porDefecto: number;
  excel: Excel;
  busqueda: Busqueda;
  expandidos: ReadonlySet<string>;
  alternarCentro: (clave: string) => void;
  anotarCentroAbierto: (abierto: CentroAbierto) => void;
  retomarCentroAbierto: () => CentroAbierto | null;
  copiar: AlCopiar;
  avisar: Avisar;
}

export interface CentroAbierto {
  codigo: string;
  indice: number;
}

export function useContextoApp(): ContextoApp {
  return useOutletContext<ContextoApp>();
}

export const PantallaApp = memo(function PantallaApp({ config, sesion, avisar }: Props) {
  const porDefecto = TAMANOS_PAGINA.includes(Number(config.filasPorPagina)) ? Number(config.filasPorPagina) : 50;
  const busqueda = useBusqueda(porDefecto);
  const [expandidos, setExpandidos] = useState<ReadonlySet<string>>(() => new Set());
  const centroAbierto = useRef<CentroAbierto | null>(null);
  const anotarCentroAbierto = useCallback((abierto: CentroAbierto) => {
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

  let actualizado = 'Cargando datos del Excel…';
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
        <Button type="button" id="btn-actualizar" variant="outline" aria-disabled={cargando} onClick={() => void excel.cargar('manual')}>
          <IconoActualizar girando={cargando} />
          <span id="texto-btn-actualizar">{cargando ? 'Actualizando…' : 'Actualizar'}</span>
        </Button>
      </div>

      <AvisoError error={excel.error} />
      <AvisoColumnas datos={datos} />

      <Outlet context={contexto} />

      <Collapsible className="mt-4 mb-2 text-sm print:hidden">
        <CollapsibleTrigger render={<Button type="button" variant="ghost" size="sm" className="group/columnas -ml-2.5" />}>
          <ChevronRightIcon aria-hidden="true" className="size-4 transition-transform group-data-panel-open/columnas:rotate-90" />
          Columnas detectadas en el Excel
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
