import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { quitarTemporales } from './scripts/archivos-temporales.mjs';
import { pluginConfigDemo } from './scripts/config-demo.mjs';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com https://*.sharepoint.com",
  "frame-src 'self' https://login.microsoftonline.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function agregarCsp(): Plugin {
  return {
    name: 'agregar-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(/<meta charset="UTF-8" \/>/i, (m) => `${m}\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    },
  };
}

function sinTemporalesDeOffice(): Plugin {
  let carpeta = 'dist';
  return {
    name: 'sin-temporales-de-office',
    apply: 'build',
    configResolved(config) {
      carpeta = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      for (const ruta of quitarTemporales(carpeta)) {
        console.warn(`Se quitó un archivo temporal de Office de la compilación (cierra Excel): ${ruta}`);
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    agregarCsp(),
    sinTemporalesDeOffice(),
    ...(mode === 'demo' ? [pluginConfigDemo(resolve(import.meta.dirname, 'public/config.json'))] : []),
  ],
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        redirect: resolve(import.meta.dirname, 'redirect.html'),
      },
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
}));
