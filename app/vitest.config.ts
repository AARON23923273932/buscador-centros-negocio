// Configuración de las pruebas unitarias (Vitest): prueban la lógica y los componentes sin abrir el navegador.
// Las pruebas de componentes que necesitan una página (clics, foco) usan jsdom: llevan arriba el
// comentario "@vitest-environment jsdom".
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // "@/…" = src/… (componentes de shadcn/ui), igual que en vite.config.ts y tsconfig.json.
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
