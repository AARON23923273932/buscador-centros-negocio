// Ayudas para probar la app con sus rutas (React Router) en una página simulada (jsdom).
// Se usa el mismo enrutador que la app (componentes/Enrutador.tsx), que lee y cambia la dirección de
// la página (location, history): así las pruebas pueden revisar location.pathname y location.search.
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Avisar } from '../../src/hooks/useAvisoFlotante.ts';
import { Enrutador } from '../../src/componentes/Enrutador.tsx';
import { RutasApp } from '../../src/componentes/RutasApp.tsx';
import type { Sesion } from '../../src/logica/auth.ts';
import type { Config } from '../../src/logica/config.ts';

/** Envoltorio para render()/renderHook() de componentes y hooks que usan React Router. */
export function ConEnrutador({ children }: { children: ReactNode }) {
  return <Enrutador>{children}</Enrutador>;
}

/** Abre las rutas de la aplicación (lo que App muestra con la sesión iniciada) en esa dirección. */
export function abrirRutas(props: { config: Config; sesion: Sesion | null; avisar: Avisar }, ruta = '/ordenes') {
  history.replaceState(null, '', ruta);
  return render(
    <Enrutador>
      <RutasApp {...props} />
    </Enrutador>,
  );
}
