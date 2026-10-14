// =============================================================================
// App.tsx — La página completa: cabecera + la pantalla que toque + aviso flotante.
//
//   config.json ──► (login Microsoft) ──► descargar Excel ──► leer filas
//        ──► buscar / filtrar / ordenar / paginar ──► dibujar la tabla
//
// Pantallas: cargando · mensaje (falta configuración, sin acceso, error) · iniciar sesión · aplicación.
//
// La aplicación tiene rutas (React Router, ver componentes/RutasApp.tsx): /ordenes, /centros,
// /centros/:codigo… Solo se muestran con la sesión iniciada: así el inicio de sesión protege TODAS.
// Antes de eso la dirección no se toca: MSAL recuerda la dirección completa (ruta + query) al ir a
// Microsoft y la persona vuelve a ESA misma (ej. /centros/A2338PY01?q=cableado).
// =============================================================================

import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { useArranque } from './hooks/useArranque.ts';
import { useAvisoFlotante } from './hooks/useAvisoFlotante.ts';
import { useTema } from './hooks/useTema.ts';
import { AvisoFlotante } from './componentes/Avisos.tsx';
import { Cabecera, type Usuario } from './componentes/Cabecera.tsx';
import { PantallaMensaje } from './componentes/Mensaje.tsx';
import { PantallaCarga } from './componentes/PantallaCarga.tsx';
import { PantallaLogin } from './componentes/PantallaLogin.tsx';
import { RutasApp } from './componentes/RutasApp.tsx';
import { vistaDeRuta } from './logica/rutas.ts';

const TITULO = 'Buscador de centros de negocio';
const SUBTITULO = 'Centros de negocio y sus órdenes de compra / servicio';

/** Botón "Reintentar" de las pantallas de error: vuelve a cargar la página. */
const REINTENTAR = { texto: 'Reintentar', principal: true, accion: () => location.reload() };

/** Ejecuta una acción de Microsoft (la página se va a Microsoft; si falla, queda en la consola). */
const irAMicrosoft = (accion: () => Promise<void>) => () => void accion().catch((e: unknown) => console.error(e));

export function App() {
  // El botón ☀️/🌙 funciona en todas las pantallas (también antes de iniciar sesión).
  const tema = useTema();
  const { aviso, avisar } = useAvisoFlotante();
  const arranque = useArranque();
  // Enlace para saltar con el teclado: al buscador en las listas (y en el inicio); al contenido en las demás rutas.
  const { pathname } = useLocation();
  const conBuscador = pathname === '/' || vistaDeRuta(pathname) !== null;

  const config = 'config' in arranque ? arranque.config : null;
  const titulo = config?.titulo ? String(config.titulo) : TITULO;
  const subtitulo = config?.subtitulo ? String(config.subtitulo) : SUBTITULO;
  useEffect(() => {
    if (config?.titulo) document.title = String(config.titulo);
  }, [config?.titulo]);

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
          <ul className="lista-errores">
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
      pantalla = <RutasApp config={arranque.config} sesion={sesion} avisar={avisar} />;
      break;
    }
  }

  return (
    <>
      <a className="saltar" href={conBuscador ? '#buscador' : '#principal'}>
        {conBuscador ? 'Saltar al buscador' : 'Saltar al contenido'}
      </a>
      <Cabecera
        titulo={titulo}
        subtitulo={subtitulo}
        usuario={usuario}
        demo={arranque.fase === 'app' && arranque.config.modo !== 'microsoft'}
        tema={tema}
      />
      <main id="principal" className="principal">
        {pantalla}
      </main>
      <AvisoFlotante aviso={aviso} />
    </>
  );
}
