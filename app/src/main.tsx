import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos.css';
import { App } from './App.tsx';
import { Enrutador } from './componentes/Enrutador.tsx';

const raiz = document.getElementById('raiz');
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <Enrutador>
        <App />
      </Enrutador>
    </StrictMode>,
  );
}
