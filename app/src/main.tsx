// Punto de entrada: monta la aplicación de React dentro de <div id="raiz"> (index.html).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos.css';
import { App } from './App.tsx';

const raiz = document.getElementById('raiz');
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
