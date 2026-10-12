// Configuración de las pruebas unitarias (Vitest): prueban la lógica sin abrir el navegador.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
  },
});
