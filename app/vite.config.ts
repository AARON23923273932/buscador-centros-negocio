// Configuración de Vite (la herramienta que sirve la app en desarrollo y la "compila" a dist/).
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { quitarTemporales } from './scripts/archivos-temporales.mjs';
import { pluginConfigDemo } from './scripts/config-demo.mjs';

/**
 * Política de seguridad de contenido (CSP): le dice al navegador de dónde puede cargar cosas.
 * Si alguien lograra meter código en una celda del Excel, el navegador no lo ejecutaría.
 * Solo se agrega al compilar (npm run build), no en modo desarrollo.
 *  - login.microsoftonline.com: inicio de sesión
 *  - graph.microsoft.com: leer el Excel
 *  - *.sharepoint.com: descarga del archivo (enlace temporal que entrega Graph)
 */
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

/**
 * Al terminar de compilar, borra de dist/ los archivos temporales de Office ("~$…", con el nombre del
 * usuario de Windows) que Vite copia desde public/ si el Excel de ejemplo está abierto.
 */
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
  // La app se publica en la RAÍZ del dominio (https://aic-centros-negocio.netlify.app/). Con React Router hay
  // rutas anidadas (/centros/A2338PY01): los archivos (assets/…, config.json, favicon…) se piden siempre desde
  // "/", no relativos a la ruta actual. Si algún día se publica en una subcarpeta, poner aquí "/subcarpeta/"
  // (React Router, config.json, el Excel de ejemplo y redirect.html la toman de import.meta.env.BASE_URL).
  base: '/',
  plugins: [
    // React: JSX/TSX y recarga instantánea en desarrollo.
    react(),
    // Tailwind CSS v4 (estilos de los componentes shadcn/ui y de la app): genera solo las clases que se usan.
    tailwindcss(),
    agregarCsp(),
    sinTemporalesDeOffice(),
    // "npm run dev:demo" / "npm run preview:demo": modo demo sin tocar public/config.json (ver scripts/config-demo.mjs).
    ...(mode === 'demo' ? [pluginConfigDemo(resolve(import.meta.dirname, 'public/config.json'))] : []),
  ],
  // "@/…" = src/… (componentes de shadcn/ui). El mismo alias está en tsconfig.json y vitest.config.ts.
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  build: {
    outDir: 'dist',
    // SheetJS (lectura de Excel) pesa ~900 KB; es normal.
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      // Dos páginas: la app y la página puente del inicio de sesión.
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        redirect: resolve(import.meta.dirname, 'redirect.html'),
      },
    },
  },
  // strictPort: si el puerto está ocupado, Vite avisa en vez de usar otro. Así la dirección de retorno
  // (http://localhost:5173/redirect.html) siempre coincide con la registrada en Entra ID.
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
}));
