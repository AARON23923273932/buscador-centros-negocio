// Pruebas de los scripts de la carpeta scripts/: publicación sin archivos temporales de Office
// y modo demo en la computadora sin tocar public/config.json.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { copiarSinTemporales, esArchivoTemporal, quitarTemporales } from '../../scripts/archivos-temporales.mjs';
import { configParaDemo, pluginConfigDemo } from '../../scripts/config-demo.mjs';
import { CONFIG_POR_DEFECTO, mezclarConfig, validarConfig } from '../../src/config.js';

const CONFIG_REAL = resolve(import.meta.dirname, '../../public/config.json');

const carpetas = [];
function carpetaTemporal() {
  const c = mkdtempSync(join(tmpdir(), 'buscador-cn-'));
  carpetas.push(c);
  return c;
}
afterEach(() => {
  for (const c of carpetas.splice(0)) rmSync(c, { recursive: true, force: true });
});

/** dist/ de mentira con el Excel de ejemplo y el archivo de bloqueo que deja Excel al tenerlo abierto. */
function distConTemporales() {
  const dist = carpetaTemporal();
  mkdirSync(join(dist, 'datos'));
  writeFileSync(join(dist, 'index.html'), '<!doctype html>');
  writeFileSync(join(dist, 'datos', 'centros-ejemplo.xlsx'), 'excel');
  writeFileSync(join(dist, 'datos', '~$centros-ejemplo.xlsx'), 'Nombre del usuario de Windows');
  writeFileSync(join(dist, 'datos', '.~lock.centros-ejemplo.xlsx#'), 'LibreOffice');
  return dist;
}

describe('archivos temporales de Office (no se publican)', () => {
  it('reconoce "~$…" de Excel y ".~lock.…#" de LibreOffice, y nada más', () => {
    expect(esArchivoTemporal('C:\\app\\public\\datos\\~$centros-ejemplo.xlsx')).toBe(true);
    expect(esArchivoTemporal('dist/datos/.~lock.centros-ejemplo.xlsx#')).toBe(true);
    expect(esArchivoTemporal('dist/datos/centros-ejemplo.xlsx')).toBe(false);
    expect(esArchivoTemporal('dist/assets/index-~$abc.js')).toBe(false);
  });

  it('preparar-publicacion copia todo menos los temporales (y dice cuáles dejó afuera)', () => {
    const dist = distConTemporales();
    const publicar = join(carpetaTemporal(), 'publicar');
    const omitidos = copiarSinTemporales(dist, publicar);
    expect(omitidos.map((r) => r.split(/[\\/]/).pop()).sort()).toEqual(['.~lock.centros-ejemplo.xlsx#', '~$centros-ejemplo.xlsx']);
    expect(existsSync(join(publicar, 'index.html'))).toBe(true);
    expect(readFileSync(join(publicar, 'datos', 'centros-ejemplo.xlsx'), 'utf8')).toBe('excel');
    expect(existsSync(join(publicar, 'datos', '~$centros-ejemplo.xlsx'))).toBe(false);
    expect(existsSync(join(publicar, 'datos', '.~lock.centros-ejemplo.xlsx#'))).toBe(false);
  });

  it('al compilar se quitan de dist/ (sin tocar el resto)', () => {
    const dist = distConTemporales();
    expect(quitarTemporales(dist)).toHaveLength(2);
    expect(existsSync(join(dist, 'datos', '~$centros-ejemplo.xlsx'))).toBe(false);
    expect(existsSync(join(dist, 'datos', 'centros-ejemplo.xlsx'))).toBe(true);
    expect(quitarTemporales(dist)).toEqual([]);
  });
});

describe('modo demo en la computadora (npm run dev:demo)', () => {
  it('a partir del config.json real: modo demo + Excel de ejemplo, conservando columnas y columnas ocultas', () => {
    const real = JSON.parse(readFileSync(CONFIG_REAL, 'utf8'));
    const demo = configParaDemo(real);
    expect(demo.modo).toBe('demo');
    expect(demo.datos.fuente).toBe('archivo-local');
    expect(demo.datos.rutaLocal).toBe('datos/centros-ejemplo.xlsx');
    expect(demo.columnas).toEqual(real.columnas);
    expect(demo.columnasOcultas).toEqual(real.columnasOcultas);
    // Es una configuración válida (la app no mostraría "Falta configurar la aplicación").
    expect(validarConfig(mezclarConfig(CONFIG_POR_DEFECTO, demo))).toEqual([]);
    // El original no cambia.
    expect(real.modo).toBe('microsoft');
    expect(real.datos.fuente).toBe('graph');
  });

  it('el servidor de Vite responde config.json con la versión demo y deja pasar lo demás', () => {
    const plugin = pluginConfigDemo(CONFIG_REAL);
    let responder;
    // "use" devuelve la pila de middlewares (como en Vite): el gancho no debe devolverla.
    const servidor = { middlewares: { use: (fn) => ((responder = fn), () => {}) } };
    expect(plugin.configureServer(servidor)).toBeUndefined();
    expect(plugin.configurePreviewServer(servidor)).toBeUndefined();
    const respuesta = { cabeceras: {}, setHeader(k, v) { this.cabeceras[k] = v; }, end(c) { this.cuerpo = c; } };
    responder({ url: '/config.json' }, respuesta, () => {
      throw new Error('no debía pasar al siguiente');
    });
    expect(JSON.parse(respuesta.cuerpo)).toMatchObject({ modo: 'demo', datos: { fuente: 'archivo-local' } });
    expect(respuesta.cabeceras['Cache-Control']).toBe('no-store');
    let paso = false;
    responder({ url: '/datos/centros-ejemplo.xlsx' }, respuesta, () => (paso = true));
    expect(paso).toBe(true);
  });
});
