// Pantalla "Bienvenido" con el botón "Iniciar sesión con Microsoft" (modo microsoft, sin sesión).
import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
    <section id="pantalla-login" className="grid min-h-[60vh] place-items-center">
      <Card className="tarjeta-centro w-full max-w-[480px] text-center">
        <CardHeader>
          <h2 className="m-0 text-2xl">Bienvenido</h2>
        </CardHeader>
        <CardContent className="items-center">
          <Button type="button" id="btn-login" ref={boton} size="lg" className="w-full max-w-[320px]" disabled={ocupado} onClick={() => void iniciar()}>
            <IconoMicrosoft />
            Iniciar sesión con Microsoft
          </Button>
          <Alert id="error-login" variant="destructive" hidden={!error}>
            {error}
          </Alert>
        </CardContent>
      </Card>
    </section>
  );
}
