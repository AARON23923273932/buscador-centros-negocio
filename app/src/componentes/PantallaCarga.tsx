// Pantalla "Cargando…" (mientras se lee config.json y se prepara el inicio de sesión).
// Está también en index.html (lo que se ve antes de que cargue React): si se cambia aquí, cambiarla allá.
import { Card } from '@/components/ui/card';
import { IndicadorCarga } from './Iconos.tsx';

/** Pantalla 1: cargando la app. */
export function PantallaCarga() {
  return (
    <section id="pantalla-carga" className="grid min-h-[60vh] place-items-center" aria-live="polite">
      <Card className="tarjeta-centro w-full max-w-[480px] text-center">
        <IndicadorCarga />
        <p className="mt-3 mb-0">Cargando…</p>
      </Card>
    </section>
  );
}
