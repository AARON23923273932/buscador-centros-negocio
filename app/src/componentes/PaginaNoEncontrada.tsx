// "Página no encontrada": cualquier dirección que no es una ruta de la app (ver RutasApp.tsx).
// Como las demás rutas, solo se ve después de iniciar sesión. No descarga el Excel.
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { RUTA_ORDENES } from '../logica/rutas.ts';

/** La ruta tal como la escribió la persona (sin los %20, %C3%B3…). */
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

  // El foco va al título (lo lee el lector de pantalla), como en las demás pantallas de mensaje.
  useEffect(() => {
    titulo.current?.focus();
  }, []);

  return (
    <section id="pantalla-no-encontrada" className="pantalla-centro">
      <div className="tarjeta tarjeta-centro">
        <h2 id="titulo-no-encontrada" ref={titulo} tabIndex={-1}>
          Página no encontrada
        </h2>
        <p>
          La dirección <code>{rutaLegible(pathname)}</code> no existe en el buscador. Puede que el enlace esté incompleto o mal
          copiado.
        </p>
        <div className="acciones-mensaje">
          <Link id="enlace-ir-al-buscador" className="btn btn-primario" to={RUTA_ORDENES}>
            Ir al buscador
          </Link>
        </div>
      </div>
    </section>
  );
}
