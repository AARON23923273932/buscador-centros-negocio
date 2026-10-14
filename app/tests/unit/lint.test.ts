// La revisión automática del código (npm run lint, con oxlint) está activa y detecta los errores de hooks
// de React que TypeScript no ve. Si alguien desactiva las reglas o rompe .oxlintrc.json, esta prueba falla.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const APP = resolve(import.meta.dirname, '../..');
const OXLINT = join(APP, 'node_modules', 'oxlint', 'bin', 'oxlint');
const CARPETA = mkdtempSync(join(tmpdir(), 'lint-'));

afterAll(() => rmSync(CARPETA, { recursive: true, force: true }));

/** Ejecuta oxlint con la configuración del proyecto (.oxlintrc.json). */
function revisar(...argumentos: string[]) {
  const r = spawnSync(process.execPath, [OXLINT, '-c', join(APP, '.oxlintrc.json'), ...argumentos], { cwd: APP, encoding: 'utf8' });
  return { codigo: r.status, salida: `${r.stdout}${r.stderr}` };
}

describe('npm run lint (oxlint)', () => {
  it('marca un hook dentro de un if y una dependencia que falta en useEffect', () => {
    const archivo = join(CARPETA, 'Malo.tsx');
    writeFileSync(
      archivo,
      [
        "import { useEffect, useState } from 'react';",
        'export function Malo({ activo, valor }: { activo: boolean; valor: number }) {',
        '  if (activo) {',
        '    const [x] = useState(0);',
        '    void x;',
        '  }',
        '  useEffect(() => {',
        '    console.log(valor);',
        '  }, []);',
        '  return null;',
        '}',
        '',
      ].join('\n'),
    );
    const { codigo, salida } = revisar(archivo);
    expect(codigo).not.toBe(0);
    expect(salida).toContain('rules-of-hooks');
    expect(salida).toContain('exhaustive-deps');
  });

  it('el código de la app pasa la revisión (lo mismo que npm run lint)', () => {
    const { codigo, salida } = revisar('--deny-warnings', 'src', 'tests', 'scripts', 'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts');
    expect(salida).toBe('');
    expect(codigo).toBe(0);
  });
});
