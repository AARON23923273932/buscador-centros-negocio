// La documentación (README, guía y plan de pruebas) se usa en la PC del proyecto, con PowerShell.
//  - En PowerShell, "npm", "npx" y "swa" están bloqueados (son scripts .ps1): los bloques ```powershell
//    deben usar npm.cmd / npx.cmd / swa.cmd para que se puedan copiar y pegar tal cual.
//  - El README explica TODOS los comandos de package.json (si se agrega uno, se documenta).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = resolve(import.meta.dirname, '../../..');
const DOCUMENTOS = ['README.md', 'GUIA-CONFIGURACION-MICROSOFT.md', 'pruebas/plan-de-pruebas.md'];
const leer = (ruta: string) => readFileSync(resolve(RAIZ, ruta), 'utf8');

/** Líneas de los bloques de código ```powershell de un documento (con su número de línea). */
function lineasPowerShell(texto: string): { numero: number; linea: string }[] {
  const resultado: { numero: number; linea: string }[] = [];
  let lenguaje: string | null = null;
  texto.split(/\r?\n/).forEach((linea, i) => {
    const valla = /^\s*```(\w*)/.exec(linea);
    if (valla) {
      lenguaje = lenguaje === null ? (valla[1] ?? '') : null;
      return;
    }
    if (lenguaje === 'powershell') resultado.push({ numero: i + 1, linea });
  });
  return resultado;
}

describe('documentación', () => {
  it('los bloques de PowerShell usan npm.cmd, npx.cmd y swa.cmd (npm, npx y swa están bloqueados)', () => {
    const malas: string[] = [];
    let revisadas = 0;
    for (const doc of DOCUMENTOS) {
      for (const { numero, linea } of lineasPowerShell(leer(doc))) {
        revisadas++;
        if (/^\s*(npm|npx|swa)\s/.test(linea)) malas.push(`${doc}:${numero}: ${linea.trim()}`);
      }
    }
    expect(revisadas).toBeGreaterThan(0);
    expect(malas).toEqual([]);
  });

  it('el README explica todos los comandos de package.json', () => {
    const { scripts } = JSON.parse(leer('app/package.json')) as { scripts: Record<string, string> };
    const readme = leer('README.md');
    const faltan = Object.keys(scripts).filter((nombre) => {
      const comando = nombre === 'test' ? 'npm test' : `npm run ${nombre}`;
      return !readme.includes(`| \`${comando}\` |`);
    });
    expect(faltan).toEqual([]);
  });
});
