// Configuración de las pruebas unitarias (Vitest): prueban la lógica y los componentes sin abrir el navegador.
// Las pruebas de componentes que necesitan una página (clics, foco) usan jsdom: llevan arriba el
// comentario "@vitest-environment jsdom".
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
