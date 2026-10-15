// Pantalla de mensaje: sin acceso, falta configuración o un error grave al arrancar.
import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Accion } from '../logica/tipos.ts';

/** Pantalla 3: un mensaje con título, explicación y botones. El foco va al título (lo lee el lector de pantalla). */
export function PantallaMensaje({ titulo, acciones = [], children }: { titulo: string; acciones?: Accion[]; children: ReactNode }) {
  const encabezado = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    encabezado.current?.focus();
  }, []);

  return (
    <section id="pantalla-mensaje" className="grid min-h-[60vh] place-items-center">
      <Card className="tarjeta-centro w-full max-w-[480px] text-center [&_p]:my-3">
        <h2 id="mensaje-titulo" ref={encabezado} tabIndex={-1} className="mt-0 mb-3 text-2xl">
          {titulo}
        </h2>
        <div id="mensaje-cuerpo">{children}</div>
        <div id="mensaje-acciones" className="mt-4 flex flex-wrap justify-center gap-2">
          {acciones.map((a) => (
            <Button key={a.texto} type="button" variant={a.principal ? 'default' : 'outline'} onClick={a.accion}>
              {a.texto}
            </Button>
          ))}
        </div>
      </Card>
    </section>
  );
}
