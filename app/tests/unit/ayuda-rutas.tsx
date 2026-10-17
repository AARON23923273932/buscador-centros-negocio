import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Avisar } from '../../src/hooks/useAvisoFlotante.ts';
import { Enrutador } from '../../src/componentes/Enrutador.tsx';
import { Outlet, Route, Routes } from 'react-router';
import { rutasConSesion } from '../../src/componentes/RutasApp.tsx';
import type { Sesion } from '../../src/logica/auth.ts';
import type { Config } from '../../src/logica/config.ts';

export function ConEnrutador({ children }: { children: ReactNode }) {
  return <Enrutador>{children}</Enrutador>;
}

export function abrirRutas(props: { config: Config; sesion: Sesion | null; avisar: Avisar }, ruta = '/ordenes') {
  history.replaceState(null, '', ruta);
  return render(
    <Enrutador>
      <Routes>
        <Route element={<Outlet context={props} />}>{rutasConSesion()}</Route>
      </Routes>
    </Enrutador>,
  );
}
