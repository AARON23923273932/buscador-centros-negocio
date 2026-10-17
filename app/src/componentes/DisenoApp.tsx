import { useEffect, useMemo, type MouseEvent, type ReactNode } from 'react';
import type { Avisar } from '../hooks/useAvisoFlotante.ts';
import type { Sesion } from '../logica/auth.ts';
import type { Config } from '../logica/config.ts';
import { Outlet, useLocation, useOutletContext } from 'react-router';
import { useArranque } from '../hooks/useArranque.ts';
import { useAvisoFlotante } from '../hooks/useAvisoFlotante.ts';
import { AvisoFlotante } from './Avisos.tsx';
import { Cabecera, type Usuario } from './Cabecera.tsx';
import { PantallaMensaje } from './Mensaje.tsx';
import { PantallaCarga } from './PantallaCarga.tsx';
import { PantallaLogin } from './PantallaLogin.tsx';
import { vistaDeRuta } from '../logica/rutas.ts';

const TITULO = 'Buscador de centros de negocio';
const SUBTITULO = 'Centros de negocio y sus órdenes de compra / servicio';

const SALTAR =
  'saltar sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground';

const REINTENTAR = { texto: 'Reintentar', principal: true, accion: () => location.reload() };

const irAMicrosoft = (accion: () => Promise<void>) => () => void accion().catch((e: unknown) => console.error(e));

function saltarA(ev: MouseEvent<HTMLAnchorElement>, id: string) {
  const destino = document.getElementById(id) ?? document.getElementById('principal');
  if (!destino) return;
  ev.preventDefault();
  if (!destino.matches('a[href], button, input, select, textarea, [tabindex]')) destino.tabIndex = -1;
  destino.focus();
}

export interface ContextoSesion {
  config: Config;
  sesion: Sesion | null;
  avisar: Avisar;
}

export function useContextoSesion(): ContextoSesion {
  return useOutletContext<ContextoSesion>();
}

export function DisenoApp() {
  const { aviso, avisar } = useAvisoFlotante();
  const arranque = useArranque();
  const { pathname } = useLocation();
  const conBuscador = pathname === '/' || vistaDeRuta(pathname) !== null;

  const config = 'config' in arranque ? arranque.config : null;
  const titulo = config?.titulo ? String(config.titulo) : TITULO;
  const subtitulo = config?.subtitulo ? String(config.subtitulo) : SUBTITULO;
  useEffect(() => {
    if (config?.titulo) document.title = String(config.titulo);
  }, [config?.titulo]);

  const configApp = arranque.fase === 'app' ? arranque.config : null;
  const sesionApp = arranque.fase === 'app' ? arranque.sesion : null;
  const contexto = useMemo<ContextoSesion | null>(
    () => (configApp ? { config: configApp, sesion: sesionApp, avisar } : null),
    [configApp, sesionApp, avisar],
  );

  let pantalla: ReactNode;
  let usuario: Usuario | null = null;
  switch (arranque.fase) {
    case 'cargando':
      pantalla = <PantallaCarga />;
      break;
    case 'sin-config':
      pantalla = (
        <PantallaMensaje titulo="No se pudo iniciar la aplicación" acciones={[REINTENTAR]}>
          <p>{arranque.error}</p>
        </PantallaMensaje>
      );
      break;
    case 'config-invalida':
      pantalla = (
        <PantallaMensaje titulo="Falta configurar la aplicación">
          <p>
            Quien administra la aplicación debe revisar el archivo <code>config.json</code> (ver la guía{' '}
            <strong>GUIA-CONFIGURACION-MICROSOFT.md</strong>):
          </p>
          <ul className="text-left">
            {arranque.errores.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </PantallaMensaje>
      );
      break;
    case 'sin-login':
      pantalla = (
        <PantallaMensaje titulo="No se pudo preparar el inicio de sesión" acciones={[REINTENTAR]}>
          <p>Revisa tu conexión a internet y vuelve a intentar. Si el problema sigue, avisa al administrador.</p>
        </PantallaMensaje>
      );
      break;
    case 'login':
      pantalla = <PantallaLogin sesion={arranque.sesion} />;
      break;
    case 'denegado': {
      const { sesion } = arranque;
      pantalla = (
        <PantallaMensaje
          titulo="Tu cuenta no tiene acceso"
          acciones={[
            { texto: 'Usar otra cuenta', principal: true, accion: irAMicrosoft(() => sesion.iniciarSesion()) },
            { texto: 'Cerrar sesión', accion: irAMicrosoft(() => sesion.cerrarSesion()) },
          ]}
        >
          <p>
            Entraste como <strong>{sesion.correo || 'una cuenta desconocida'}</strong>.
          </p>
          <p>{sesion.motivo}</p>
          <p>Si crees que es un error, pide acceso a tu jefe o al área de sistemas.</p>
        </PantallaMensaje>
      );
      break;
    }
    case 'app': {
      const { sesion } = arranque;
      if (sesion) {
        usuario = { nombre: sesion.nombre, correo: sesion.correo, cerrarSesion: irAMicrosoft(() => sesion.cerrarSesion()) };
      }
      pantalla = <Outlet context={contexto} />;
      break;
    }
  }

  return (
    <>
      <a
        className={SALTAR}
        href={conBuscador ? '#buscador' : '#principal'}
        onClick={(ev) => saltarA(ev, conBuscador ? 'buscador' : 'principal')}
      >
        {conBuscador ? 'Saltar al buscador' : 'Saltar al contenido'}
      </a>
      <Cabecera
        titulo={titulo}
        subtitulo={subtitulo}
        usuario={usuario}
        demo={arranque.fase === 'app' && arranque.config.modo !== 'microsoft'}
      />
      <main id="principal" className="columna pt-5 pb-4 max-escritorio:pt-3 max-escritorio:pb-3">
        {pantalla}
      </main>
      <AvisoFlotante aviso={aviso} />
    </>
  );
}
