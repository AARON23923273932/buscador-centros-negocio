// Botón ☀️/🌙: cambia entre modo claro y oscuro. Se ve en todas las pantallas (también antes de iniciar sesión).
// Muestra el ícono del modo AL QUE se cambia (luna en claro, sol en oscuro) según <html data-tema-efectivo>
// (clases de Iconos.tsx). Su nombre (aria-label) también se ve como ayuda flotante (AyudaFlotante: Tooltip de
// shadcn/ui) al pasar el mouse y al llegar con el teclado. La ayuda repite el nombre: con sinDescripcion el lector
// de pantalla no lo lee dos veces.
import { Button } from '@/components/ui/button';
import type { EstadoTema } from '../hooks/useTema.ts';
import { AyudaFlotante } from './AyudaFlotante.tsx';
import { IconoLuna, IconoSol } from './Iconos.tsx';

export function BotonTema({ tema }: { tema: EstadoTema }) {
  return (
    <AyudaFlotante texto={tema.etiqueta} sinDescripcion>
      <Button type="button" id="btn-tema" variant="outline" size="icon" className="flex-none" aria-label={tema.etiqueta} onClick={tema.alternar}>
        <IconoLuna />
        <IconoSol />
      </Button>
    </AyudaFlotante>
  );
}
