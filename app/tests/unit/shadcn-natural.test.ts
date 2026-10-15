// Componentes de shadcn/ui "naturales" (pedido de Gustavo, 15/10/2026: "que use los estilos naturales de shadcn …
// sin cambios, solo agregando el estilo de marca"): los archivos de src/components/ui quedan como los genera
// "npx shadcn add" y la marca de AIC entra solo por las variables del tema (src/estilos.css).
//
// La prueba definitiva necesita internet y se hace a mano (README, sección 8.2):
//   npx.cmd shadcn add <componentes> --dry-run   → cada archivo debe decir "skip (identical)".
// Esta prueba (sin internet) atrapa los cambios a mano más comunes: comentarios en español (los archivos de shadcn/ui
// son solo ASCII) y las adaptaciones que tenía la versión anterior (variables y utilidades propias, opciones agregadas).
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const UI = resolve(import.meta.dirname, '../../src/components/ui');
const ARCHIVOS = readdirSync(UI).filter((nombre) => nombre.endsWith('.tsx'));
const leer = (nombre: string) => readFileSync(join(UI, nombre), 'utf8');

/** Lo que la versión anterior les agregaba a mano (para la guía de AIC) y ya no debe estar. */
const ADAPTACIONES = [
  /foco-(control|primario|encabezado)/, // utilidades de foco propias
  /sinDescripcion|RadioGroupBoton/, // opciones agregadas al Tooltip y al RadioGroup
  /container\?: boolean/, // opción agregada a la Table
  /\b(?:bg|text|border)-(?:nota|cebra|enlace|titulo|subtitulo|marca|desactivado|encabezado|fila-)/, // colores propios
  /variant: \{[^}]*\berror:/, // variante "error" agregada al Alert
];

describe('componentes de shadcn/ui sin cambios (src/components/ui)', () => {
  it('están los que usa la app', () => {
    expect(ARCHIVOS).toEqual(
      expect.arrayContaining(['alert.tsx', 'badge.tsx', 'button.tsx', 'button-group.tsx', 'card.tsx', 'input.tsx', 'native-select.tsx', 'radio-group.tsx', 'table.tsx', 'tooltip.tsx']),
    );
  });

  it('son solo ASCII, como los genera shadcn (sin comentarios ni textos en español agregados a mano)', () => {
    // Fuera de lo permitido: todo lo que no sea tabulador, salto de línea o un carácter ASCII visible.
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
});
