import { Fragment, type ReactNode } from 'react';
import { CircleAlertIcon, TriangleAlertIcon } from 'lucide-react';
import { cn } from 'cn';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { AvisoFlotante as DatosAvisoFlotante } from '../hooks/useAvisoFlotante.ts';
import type { AvisoError as DatosAvisoError } from '../hooks/useExcel.ts';
import type { ResultadoLectura } from '../logica/tipos.ts';

export function AvisoError({ error }: { error: DatosAvisoError | null }) {
  return (
    <Alert id="aviso-error" variant="destructive" className="mb-3 [overflow-wrap:anywhere]" hidden={!error}>
      {error && (
        <>
          <CircleAlertIcon aria-hidden="true" />
          <div>
            <span key={error.id} className="font-semibold">
              {error.mensaje}
            </span>
            {error.acciones.map((a) => (
              <Fragment key={a.texto}>
                {' '}
                <Button type="button" variant="outline" size="sm" className="mt-1" onClick={a.accion}>
                  {a.texto}
                </Button>
              </Fragment>
            ))}
          </div>
        </>
      )}
    </Alert>
  );
}

export function AvisoColumnas({ datos }: { datos: ResultadoLectura | null }) {
  const partes: ReactNode[] = [];
  if (datos?.faltantes.length) {
    const { faltantes, columnas, hojas, hoja } = datos;
    const encontrados = columnas.map((c) => `${c.letra}: ${c.titulo}`).join(' · ') || '(ninguno)';
    partes.push(
      <>
        <strong>No se encontraron estas columnas en el Excel:</strong>
        {` ${faltantes.map((f) => f.nombre).join(', ')}. `}
        {'Los filtros de esas columnas están desactivados. Revisa los títulos del Excel o agrega el nombre en la sección '}
        {'"columnas" de config.json.'}
        <br />
        <small>
          {`Títulos encontrados (hoja "${hoja}", fila ${datos.filaEncabezado ?? '–'}): ${encontrados}`}
          {hojas.length > 1 && (
            <>
              <br />
              {`Hojas del Excel: ${hojas.join(', ')}. Si los datos están en otra, ponla en "datos.hoja" de config.json.`}
            </>
          )}
        </small>
      </>,
    );
  }
  if (datos && datos.formulasSinCalcular > 0) {
    partes.push(
      <>
        <strong>
          {`${datos.formulasSinCalcular.toLocaleString('es-PE')} celda(s) del Excel tienen una fórmula sin resultado guardado`}
        </strong>
        {' y se ven vacías. '}
        {'Si deberían tener datos: abrir el Excel en Excel y guardarlo, o pedir que el bot escriba valores en vez de fórmulas.'}
      </>,
    );
  }
  return (
    <Alert id="aviso-columnas" role="note" className="mb-3 [overflow-wrap:anywhere]" hidden={partes.length === 0}>
      {partes.length > 0 && <TriangleAlertIcon aria-hidden="true" />}
      <div>
        {partes.map((p, i) => (
          <Fragment key={i}>
            {i > 0 && <Separator className="my-2" />}
            {p}
          </Fragment>
        ))}
      </div>
    </Alert>
  );
}

export function AvisoFlotante({ aviso }: { aviso: DatosAvisoFlotante }) {
  return (
    <div
      id="aviso-flotante"
      className={cn(
        'aviso-flotante pointer-events-none fixed bottom-5 left-1/2 z-50 max-w-[calc(100vw-32px)] -translate-x-1/2 translate-y-5 rounded-md bg-foreground px-4 py-2.5 text-sm text-background opacity-0 transition-[opacity,translate] duration-200',
        aviso.visible && 'visible translate-y-0 opacity-100',
      )}
      role="status"
      aria-live="polite"
    >
      {aviso.texto && <span key={aviso.id}>{aviso.texto}</span>}
    </div>
  );
}
