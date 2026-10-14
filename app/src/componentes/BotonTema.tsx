// Botón ☀️/🌙: cambia entre modo claro y oscuro. Se ve en todas las pantallas (también antes de iniciar sesión).
// El CSS muestra el ícono del modo AL QUE se cambia (luna en claro, sol en oscuro) según <html data-tema-efectivo>.
import type { EstadoTema } from '../hooks/useTema.ts';
import { IconoLuna, IconoSol } from './Iconos.tsx';

export function BotonTema({ tema }: { tema: EstadoTema }) {
  return (
    <button type="button" id="btn-tema" className="btn-tema" aria-label={tema.etiqueta} title={tema.etiqueta} onClick={tema.alternar}>
      <IconoLuna />
      <IconoSol />
    </button>
  );
}
