// Revisiones del código fuente (no de la app funcionando): cosas que TypeScript y las demás pruebas no ven.
//  1. Caracteres invisibles: una tilde "suelta" (U+0300…U+036F) o un espacio de ancho cero pegados tal cual
//     en el código no se ven en el editor, y un editor o formateador que "normalice" el texto los puede
//     cambiar sin que nadie lo note (ej. la expresión que quita las tildes en logica/filtros.ts). Se escriben
//     con su código: \u0300.
//  2. Los comentarios que nombran un archivo de la app (src/…, scripts/…, tests/…, public/…) apuntan a uno
//     que existe (ej. tras pasar de .js a .ts no debe quedar un comentario que nombre el antiguo tema.js).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP = resolve(import.meta.dirname, '../..');
const CARPETAS = ['src', 'tests', 'scripts', 'public'];
const SUELTOS = ['index.html', 'redirect.html', 'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts'];
const EXTENSIONES = /\.(?:ts|tsx|js|mjs|css|html|json|toml)$/;

function archivosDe(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivosDe(ruta);
    return EXTENSIONES.test(nombre) || nombre === '_headers' ? [ruta] : [];
  });
}

const ARCHIVOS = [...CARPETAS.flatMap((c) => archivosDe(join(APP, c))), ...SUELTOS.map((a) => join(APP, a))];
const leer = (ruta: string) => readFileSync(ruta, 'utf8');
const nombre = (ruta: string) => relative(APP, ruta).replaceAll('\\', '/');

/** Rangos de caracteres invisibles (por código, para que este archivo tampoco los tenga pegados). */
const INVISIBLES: readonly [desde: number, hasta: number, que: string][] = [
  [0x0300, 0x036f, 'tilde suelta (marca diacrítica)'],
  [0x00ad, 0x00ad, 'guion invisible'],
  [0x200b, 0x200f, 'espacio de ancho cero o marca de dirección'],
  [0x202a, 0x202e, 'control de dirección del texto'],
  [0x2060, 0x2064, 'carácter invisible'],
  [0xfeff, 0xfeff, 'BOM / espacio de ancho cero'],
];

describe('código fuente', () => {
  it('revisa los archivos de la app (la lista no está vacía)', () => {
    expect(ARCHIVOS.map(nombre)).toEqual(expect.arrayContaining(['src/logica/filtros.ts', 'public/tema-inicial.js', 'index.html']));
  });

  it('no tiene caracteres invisibles pegados tal cual (se escriben con su código, ej. \\u0300)', () => {
    const encontrados: string[] = [];
    for (const ruta of ARCHIVOS) {
      leer(ruta)
        .split('\n')
        .forEach((linea, i) => {
          for (const caracter of linea) {
            const codigo = caracter.codePointAt(0) ?? 0;
            const invisible = INVISIBLES.find(([desde, hasta]) => codigo >= desde && codigo <= hasta);
            if (invisible) {
              encontrados.push(`${nombre(ruta)}:${i + 1}: U+${codigo.toString(16).toUpperCase().padStart(4, '0')} (${invisible[2]})`);
            }
          }
        });
    }
    expect(encontrados).toEqual([]);
  });

  it('los comentarios que nombran archivos de la app apuntan a archivos que existen', () => {
    const referencia = /(?<![\w./-])((?:src|scripts|tests|public)\/[\w./-]+\.(?:tsx|ts|mjs|js|css|html|json))(?![\w])/g;
    const rotas: string[] = [];
    for (const ruta of ARCHIVOS) {
      for (const [, archivo] of leer(ruta).matchAll(referencia)) {
        if (archivo && !existsSync(join(APP, archivo))) rotas.push(`${nombre(ruta)} nombra ${archivo}`);
      }
    }
    expect(rotas).toEqual([]);
  });
});
