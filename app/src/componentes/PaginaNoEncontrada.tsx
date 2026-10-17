import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { RUTA_ORDENES } from '../logica/rutas.ts';

function rutaLegible(ruta: string): string {
  try {
    return decodeURIComponent(ruta);
  } catch {
    return ruta;
  }
}

export function PaginaNoEncontrada() {
  const { pathname } = useLocation();
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titulo.current?.focus();
  }, []);

  return (
    <section id="pantalla-no-encontrada" className="grid min-h-[60vh] place-items-center">
      <Card className="tarjeta-centro w-full max-w-[480px] text-center">
        <CardHeader>
          <h2 id="titulo-no-encontrada" ref={titulo} tabIndex={-1} className="m-0 text-2xl">
            Página no encontrada
          </h2>
        </CardHeader>
        <CardContent>
          <p className="[overflow-wrap:anywhere]">
            La dirección <code>{rutaLegible(pathname)}</code> no existe en el buscador. Puede que el enlace esté incompleto o
            mal copiado.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Link id="enlace-ir-al-buscador" to={RUTA_ORDENES} className={buttonVariants()}>
            Ir al buscador
          </Link>
        </CardFooter>
      </Card>
    </section>
  );
}
