import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Sesion } from '../logica/auth.ts';
import { IconoMicrosoft } from './Iconos.tsx';

export function PantallaLogin({ sesion }: { sesion: Sesion }) {
  const [error, setError] = useState(sesion.errorLogin);
  const [ocupado, setOcupado] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);

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
        <CardHeader className="justify-items-center gap-3">
          <h2 className="m-0 text-2xl">Bienvenido</h2>
          <p className="m-0 text-sm text-muted-foreground">Ingresa con tu cuenta de Microsoft.</p>
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
