import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router';
import { BASE_APP } from '../logica/rutas.ts';

const carpeta = BASE_APP.replace(/\/+$/, '');

export function Enrutador({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter basename={carpeta || undefined} useTransitions={false}>
      {children}
    </BrowserRouter>
  );
}
