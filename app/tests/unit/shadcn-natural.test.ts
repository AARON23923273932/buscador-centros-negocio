import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const UI = resolve(import.meta.dirname, '../../src/components/ui');
const ARCHIVOS = readdirSync(UI).filter((nombre) => nombre.endsWith('.tsx'));
const leer = (nombre: string) => readFileSync(join(UI, nombre), 'utf8');
const UTILS = resolve(import.meta.dirname, '../../src/lib/utils.ts');

const ADAPTACIONES = [
  /foco-(control|primario|encabezado)/,
  /sinDescripcion|RadioGroupBoton/,
  /container\?: boolean/,
  /\b(?:bg|text|border)-(?:nota|cebra|enlace|titulo|subtitulo|marca|desactivado|encabezado|fila-)/,
  /variant: \{[^}]*\berror:/,
];

describe('componentes de shadcn/ui sin cambios (src/components/ui)', () => {
  it('están los que usa la app', () => {
    expect(ARCHIVOS).toEqual(
      expect.arrayContaining(['alert.tsx', 'badge.tsx', 'button.tsx', 'button-group.tsx', 'card.tsx', 'input.tsx', 'native-select.tsx', 'radio-group.tsx', 'table.tsx']),
    );
  });

  it('son solo ASCII, como los genera shadcn (sin comentarios ni textos en español agregados a mano)', () => {
    const conTildes = ARCHIVOS.filter((nombre) => /[^\t\n\r -~]/.test(leer(nombre)));
    expect(conTildes).toEqual([]);
  });

  it('no tienen las adaptaciones de la versión anterior (la marca va solo en las variables de src/estilos.css)', () => {
    const encontradas = ARCHIVOS.flatMap((nombre) => ADAPTACIONES.filter((patron) => patron.test(leer(nombre))).map((patron) => `${nombre}: ${patron}`));
    expect(encontradas).toEqual([]);
  });

  it('importan cn() del paquete "cn" (lo que genera la versión instalada de shadcn con este components.json)', () => {
    const sinCn = ARCHIVOS.filter((nombre) => /\bcn\(/.test(leer(nombre)) && !leer(nombre).includes('import { cn } from "cn"'));
    expect(sinCn).toEqual([]);
  });

  it('tienen finales de línea LF, como los escribe shadcn (así un "cmp" con lo que genera da idénticos byte a byte)', () => {
    const conCrlf = [...ARCHIVOS.map((nombre) => join(UI, nombre)), UTILS].filter((ruta) => readFileSync(ruta, 'utf8').includes('\r'));
    expect(conCrlf).toEqual([]);
  });
});

describe('controles de la app: los de shadcn/ui', () => {
  const PROPIOS = readdirSync(resolve(import.meta.dirname, '../../src'), { recursive: true, encoding: 'utf8' })
    .filter((ruta) => ruta.endsWith('.tsx') && !ruta.replaceAll('\\', '/').startsWith('components/ui/'))
    .map((ruta) => resolve(import.meta.dirname, '../../src', ruta));

  it('fuera de src/components/ui no hay <button>, <input>, <select> ni <textarea> nativos, salvo el título que ordena', () => {
    const nativos = PROPIOS.flatMap((ruta) =>
      readFileSync(ruta, 'utf8')
        .split(/\r?\n/)
        .flatMap((linea, i) => (/<(button|input|select|textarea)\b/.test(linea) && !/^\s*(\/\/|\*)/.test(linea) ? [`${ruta.replaceAll('\\', '/').split('/src/')[1]}:${i + 1}`] : [])),
    );
    expect(nativos).toHaveLength(1);
    expect(nativos[0]).toMatch(/^componentes\/Celdas\.tsx:\d+$/);
  });
});
