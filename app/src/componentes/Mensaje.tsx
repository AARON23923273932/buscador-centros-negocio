// Pantalla de mensaje: sin acceso, falta configuración o un error grave al arrancar.
import { useEffect, useRef, type ReactNode } from 'react';
import type { Accion } from '../logica/tipos.ts';

/** Pantalla 3: un mensaje con título, explicación y botones. El foco va al título (lo lee el lector de pantalla). */
export function PantallaMensaje({ titulo, acciones = [], children }: { titulo: string; acciones?: Accion[]; children: ReactNode }) {
  const encabezado = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    encabezado.current?.focus();
  }, []);

  return (
    <section id="pantalla-mensaje" className="pantalla-centro">
      <div className="tarjeta tarjeta-centro">
        <h2 id="mensaje-titulo" ref={encabezado} tabIndex={-1}>
          {titulo}
        </h2>
        <div id="mensaje-cuerpo">{children}</div>
        <div id="mensaje-acciones" className="acciones-mensaje">
          {acciones.map((a) => (
            <button key={a.texto} type="button" className={`btn ${a.principal ? 'btn-primario' : 'btn-secundario'}`} onClick={a.accion}>
              {a.texto}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
