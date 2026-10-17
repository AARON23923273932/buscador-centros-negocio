import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import type { Accion } from '../logica/tipos.ts';

export function PantallaMensaje({ titulo, acciones = [], children }: { titulo: string; acciones?: Accion[]; children: ReactNode }) {
  const encabezado = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    encabezado.current?.focus();
  }, []);

  return (
    <section id="pantalla-mensaje" className="grid min-h-[60vh] place-items-center">
      <Card className="tarjeta-centro w-full max-w-[480px] text-center">
        <CardHeader>
          <h2 id="mensaje-titulo" ref={encabezado} tabIndex={-1} className="m-0 text-2xl">
            {titulo}
          </h2>
        </CardHeader>
        <CardContent id="mensaje-cuerpo">{children}</CardContent>
        {acciones.length > 0 && (
          <CardFooter id="mensaje-acciones" className="flex-wrap justify-center gap-2">
            {acciones.map((a) => (
              <Button key={a.texto} type="button" variant={a.principal ? 'default' : 'outline'} onClick={a.accion}>
                {a.texto}
              </Button>
            ))}
          </CardFooter>
        )}
      </Card>
    </section>
  );
}
