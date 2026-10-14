// =============================================================================
// RutasApp — Las rutas de la aplicación (React Router). Solo se usan con la sesión ya iniciada
// (App.tsx las muestra en la fase "app"): el inicio de sesión protege TODAS las rutas.
//
//   /                 → /ordenes (conserva la query; ?vista=centro → /centros)
//   /ordenes          → VistaLista "Por orden"            ┐ dentro de PantallaApp: el Excel se descarga
//   /centros          → VistaLista "Por centro"           │ una vez y la búsqueda se conserva al pasar
//   /centros/:codigo  → DetalleCentro                     ┘ de una ruta a otra
//   cualquier otra    → PaginaNoEncontrada
//
// Reglas para pasar de una ruta a otra (enlaces viejos, ?vista=…): logica/rutas.ts.
// Para que recargar /centros/A2338PY01 funcione en el hosting, el servidor debe responder index.html a
// cualquier ruta que no sea un archivo: public/_redirects (Netlify) y public/staticwebapp.config.json (Azure).
// =============================================================================

import { memo } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import type { Avisar } from '../hooks/useAvisoFlotante.ts';
import type { Sesion } from '../logica/auth.ts';
import type { Config } from '../logica/config.ts';
import { destinoCompatible, RUTA_ORDENES } from '../logica/rutas.ts';
import { DetalleCentro } from './DetalleCentro.tsx';
import { PaginaNoEncontrada } from './PaginaNoEncontrada.tsx';
import { PantallaApp } from './PantallaApp.tsx';
import { VistaLista } from './VistaLista.tsx';

interface Props {
  config: Config;
  /** null en modo demo. */
  sesion: Sesion | null;
  avisar: Avisar;
}

/** "/" (o un enlace viejo a /index.html): a la lista, conservando la búsqueda del enlace. */
function IrALista() {
  const { pathname, search } = useLocation();
  return <Navigate to={destinoCompatible(pathname, search) ?? { pathname: RUTA_ORDENES, search }} replace />;
}

/** memo(): el aviso flotante y el botón ☀️/🌙 (estado de App) no redibujan las rutas. */
export const RutasApp = memo(function RutasApp({ config, sesion, avisar }: Props) {
  return (
    <Routes>
      <Route element={<PantallaApp config={config} sesion={sesion} avisar={avisar} />}>
        <Route index element={<IrALista />} />
        <Route path="index.html" element={<IrALista />} />
        <Route path="ordenes" element={<VistaLista />} />
        <Route path="centros" element={<VistaLista />} />
        <Route path="centros/:codigo" element={<DetalleCentro />} />
      </Route>
      <Route path="*" element={<PaginaNoEncontrada />} />
    </Routes>
  );
});
