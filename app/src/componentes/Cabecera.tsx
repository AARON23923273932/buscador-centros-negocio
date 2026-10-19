import { ModeToggle } from '@/components/mode-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { iniciales } from '../logica/formato.ts';
import { LogoAic } from './Iconos.tsx';

export interface Usuario {
  nombre: string;
  correo: string;
  cerrarSesion: () => void;
}

interface Props {
  titulo: string;
  subtitulo: string;
  usuario: Usuario | null;
  demo: boolean;
}

export function Cabecera({ titulo, subtitulo, usuario, demo }: Props) {
  return (
    <header className="cabecera relative bg-card shadow-xs print:hidden">
      <div className="columna flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 max-escritorio:py-2.5">
        <div className="flex min-w-0 items-center gap-4 max-escritorio:gap-3">
          <a href="https://www.aic.pe/" target="_blank" rel="noopener noreferrer" className="logo flex-none rounded-md" aria-label="AIC (abre www.aic.pe en otra pestaña)">
            <LogoAic className="h-10 max-escritorio:h-9" />
          </a>
          <Separator orientation="vertical" className="my-1 max-escritorio:hidden" />
          <div className="min-w-0">
            <h1 id="titulo-app" className="m-0 text-xl">
              {titulo}
            </h1>
            <p id="subtitulo-app" className="m-0 text-sm text-muted-foreground max-escritorio:hidden">
              {subtitulo}
            </p>
          </div>
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <div id="zona-usuario" className="flex min-w-0 items-center gap-3" hidden={!demo && !usuario}>
            <Badge id="insignia-demo" variant="outline" hidden={!demo}>
              Modo demostración
            </Badge>
            <div id="datos-usuario" className="flex min-w-0 items-center gap-2.5" hidden={!usuario}>
              <span
                id="iniciales-usuario"
                className="grid size-[34px] flex-none place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground"
                aria-hidden="true"
              >
                {usuario ? iniciales(usuario.nombre || usuario.correo) : ''}
              </span>
              <span className="flex min-w-0 flex-col leading-tight max-escritorio:hidden">
                <span id="nombre-usuario" className="text-sm font-semibold">
                  {usuario?.nombre}
                </span>
                <span id="correo-usuario" className="max-w-[260px] truncate text-xs text-muted-foreground">
                  {usuario?.correo}
                </span>
              </span>
              <Button type="button" id="btn-cerrar-sesion" variant="outline" size="sm" onClick={usuario?.cerrarSesion}>
                Cerrar sesión
              </Button>
            </div>
          </div>
          <ModeToggle />
        </div>
      </div>
      <div aria-hidden="true" className="h-[3px] bg-linear-to-r from-primary from-40% to-marca-naranja" />
    </header>
  );
}
