// Cabecera: nombre de la app, quién inició sesión (o "Modo demostración") y el botón de tema.
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
    <header className="cabecera">
      <div className="cabecera-interior">
        <div className="marca">
          <span className="logo" aria-hidden="true">
            <IconoLogo />
          </span>
          <div className="marca-textos">
            <h1 id="titulo-app">{titulo}</h1>
            <p id="subtitulo-app" className="subtitulo">
              {subtitulo}
            </p>
          </div>
        </div>
        <div className="cabecera-acciones">
          <div id="zona-usuario" className="zona-usuario" hidden={!demo && !usuario}>
            <span id="insignia-demo" className="insignia-demo" hidden={!demo}>
              Modo demostración
            </span>
            <div id="datos-usuario" className="datos-usuario" hidden={!usuario}>
              <span id="iniciales-usuario" className="avatar" aria-hidden="true">
                {usuario ? iniciales(usuario.nombre || usuario.correo) : ''}
              </span>
              <span className="usuario-textos">
                <span id="nombre-usuario" className="usuario-nombre">
                  {usuario?.nombre}
                </span>
                <span id="correo-usuario" className="usuario-correo">
                  {usuario?.correo}
                </span>
              </span>
              <button type="button" id="btn-cerrar-sesion" className="btn btn-secundario btn-pequeno" onClick={usuario?.cerrarSesion}>
                Cerrar sesión
              </button>
            </div>
          </div>
          <BotonTema tema={tema} />
        </div>
      </div>
    </header>
  );
}
