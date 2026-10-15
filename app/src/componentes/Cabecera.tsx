// Cabecera: nombre de la app, quién inició sesión (o "Modo demostración") y el botón de tema.
// Guía de AIC: título en Primary Blue y negrita con una línea inferior gruesa del mismo color (como el
// "Heading 1" de la guía); colores del tema (estilos.css). Badge y Button de shadcn/ui sin clases de color.
// Si se cambia algo aquí, cambiarlo también en index.html (lo revisa tests/unit/pagina-inicial.test.tsx).
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { EstadoTema } from '../hooks/useTema.ts';
import { iniciales } from '../logica/formato.ts';
import { BotonTema } from './BotonTema.tsx';
import { IconoLogo } from './Iconos.tsx';

/** Persona que inició sesión con Microsoft. */
export interface Usuario {
  nombre: string;
  correo: string;
  cerrarSesion: () => void;
}

interface Props {
  titulo: string;
  subtitulo: string;
  /** null = nadie (modo demo, o todavía no inició sesión). */
  usuario: Usuario | null;
  demo: boolean;
  tema: EstadoTema;
}

export function Cabecera({ titulo, subtitulo, usuario, demo, tema }: Props) {
  return (
    <header className="cabecera border-b-2 border-primary bg-card print:hidden">
      <div className="columna flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 max-escritorio:py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="logo grid size-10 flex-none place-items-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
            <IconoLogo />
          </span>
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
          <BotonTema tema={tema} />
        </div>
      </div>
    </header>
  );
}
