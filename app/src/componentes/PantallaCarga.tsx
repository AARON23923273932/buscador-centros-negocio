// Pantalla "Cargando…" (mientras se lee config.json y se prepara el inicio de sesión).
// Está también en index.html (lo que se ve antes de que cargue React): si se cambia aquí, cambiarla allá.
import { Card, CardContent } from '@/components/ui/card';
import { IndicadorCarga } from './Iconos.tsx';

/** Pantalla 1: cargando la app. */
export function PantallaCarga() {
  return (
    <section id="pantalla-carga" className="grid min-h-[60vh] place-items-center" aria-live="polite">
      <Card className="tarjeta-centro w-full max-w-[480px] text-center">
        <CardContent className="items-center">
          <IndicadorCarga />
          <p>Cargando…</p>
        </CardContent>
      </Card>
    </section>
  );
}
