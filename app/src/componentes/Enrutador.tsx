// El enrutador de la app (React Router en modo navegador): lee y cambia la dirección (/ordenes, /centros/…).
// Lo usan src/main.tsx y las pruebas.
//
// useTransitions={false}: React Router v7 actualiza la dirección "en segundo plano" (como transición) si no
// se le dice otra cosa. Aquí la dirección y la búsqueda deben cambiar JUNTAS (ver hooks/useEstadoUrl.ts):
// si no, por un instante la pantalla vería la ruta nueva con la búsqueda vieja (o al revés).
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router';
import { BASE_APP } from '../logica/rutas.ts';

/** Carpeta de la app sin la "/" final ("" en la raíz del dominio: React Router usa "/"). */
const carpeta = BASE_APP.replace(/\/+$/, '');

export function Enrutador({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter basename={carpeta || undefined} useTransitions={false}>
      {children}
    </BrowserRouter>
  );
}
