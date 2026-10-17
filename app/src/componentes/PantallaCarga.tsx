import { Card, CardContent } from '@/components/ui/card';
import { IndicadorCarga } from './Iconos.tsx';

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
