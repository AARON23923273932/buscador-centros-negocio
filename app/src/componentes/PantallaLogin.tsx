// Pantalla "Bienvenido" con el botón "Iniciar sesión con Microsoft" (modo microsoft, sin sesión).
import { useEffect, useRef, useState } from 'react';
import type { Sesion } from '../logica/auth.ts';
import { IconoMicrosoft } from './Iconos.tsx';

/** Pantalla 2: iniciar sesión con Microsoft. */
export function PantallaLogin({ sesion }: { sesion: Sesion }) {
  const [error, setError] = useState(sesion.errorLogin);
  const [ocupado, setOcupado] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);

  // El foco empieza en el botón (Enter inicia sesión), pero SIN el anillo de foco: al abrir la página nadie
  // usó todavía el teclado y el navegador lo mostraría como si sí (pedido del supervisor, 14/10/2026).
  // Con Tab el anillo aparece normalmente en lo que reciba el foco.
  useEffect(() => {
    boton.current?.focus({ focusVisible: false });
  }, []);

  const iniciar = async () => {
    setOcupado(true);
    try {
      await sesion.iniciarSesion();
    } catch (e) {
      console.error(e);
      setOcupado(false);
      setError('No se pudo abrir el inicio de sesión de Microsoft. Vuelve a intentarlo.');
    }
  };

  return (
    <section id="pantalla-login" className="pantalla-centro">
      <div className="tarjeta tarjeta-centro">
        <h2>Bienvenido</h2>
        <button type="button" id="btn-login" ref={boton} className="btn btn-primario btn-grande" disabled={ocupado} onClick={() => void iniciar()}>
          <IconoMicrosoft />
          Iniciar sesión con Microsoft
        </button>
        <p id="error-login" className="aviso aviso-error" role="alert" hidden={!error}>
          {error}
        </p>
      </div>
    </section>
  );
}
