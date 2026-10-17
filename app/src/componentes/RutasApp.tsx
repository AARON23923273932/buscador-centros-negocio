import { Navigate, Route, Routes, useLocation } from 'react-router';
import { destinoCompatible, RUTA_ORDENES } from '../logica/rutas.ts';
import { DetalleCentro } from './DetalleCentro.tsx';
import { DisenoApp, useContextoSesion } from './DisenoApp.tsx';
import { PaginaNoEncontrada } from './PaginaNoEncontrada.tsx';
import { PantallaApp } from './PantallaApp.tsx';
import { VistaLista } from './VistaLista.tsx';

function IrALista() {
  const { pathname, search } = useLocation();
  return <Navigate to={destinoCompatible(pathname, search) ?? { pathname: RUTA_ORDENES, search }} replace />;
}

function PantallaConSesion() {
  const { config, sesion, avisar } = useContextoSesion();
  return <PantallaApp config={config} sesion={sesion} avisar={avisar} />;
}

export function rutasConSesion() {
  return (
    <>
      <Route element={<PantallaConSesion />}>
        <Route index element={<IrALista />} />
        <Route path="index.html" element={<IrALista />} />
        <Route path="ordenes" element={<VistaLista />} />
        <Route path="centros" element={<VistaLista />} />
        <Route path="centros/:codigo" element={<DetalleCentro />} />
      </Route>
      <Route path="*" element={<PaginaNoEncontrada />} />
    </>
  );
}

export function RutasApp() {
  return (
    <Routes>
      <Route element={<DisenoApp />}>{rutasConSesion()}</Route>
    </Routes>
  );
}
