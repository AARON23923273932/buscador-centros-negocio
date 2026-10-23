import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONFIG_POR_DEFECTO, cargarConfig, mezclarConfig, revisarConfig, validarConfig } from '../../src/logica/config.ts';

const GUID = '11111111-2222-3333-4444-555555555555';

describe('mezclarConfig', () => {
  it('completa con valores por defecto e ignora comentarios "_"', () => {
    const c = mezclarConfig(CONFIG_POR_DEFECTO, { _ayuda: 'x', titulo: 'Otro', microsoft: { clientId: GUID, _nota: 'y' } });
    expect(c.titulo).toBe('Otro');
    expect(c.microsoft).toMatchObject({ clientId: GUID, dominiosPermitidos: ['aic.pe', 'jaicoscorp.com'] });
    expect((c as unknown as Record<string, unknown>)._ayuda).toBeUndefined();
    expect((c.microsoft as unknown as Record<string, unknown>)._nota).toBeUndefined();
  });
  it('las listas se reemplazan completas y no se modifica la base', () => {
    const c = mezclarConfig(CONFIG_POR_DEFECTO, { microsoft: { dominiosPermitidos: ['aic.pe'] } });
    expect(c.microsoft).toMatchObject({ dominiosPermitidos: ['aic.pe'] });
    expect(CONFIG_POR_DEFECTO.microsoft.dominiosPermitidos).toHaveLength(2);
  });
});

describe('validarConfig', () => {
  it('la configuración por defecto (demo) es válida', () => {
    expect(validarConfig(CONFIG_POR_DEFECTO)).toEqual([]);
  });
  it('el config.json publicado es válido', () => {
    const json = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../public/config.json'), 'utf8'));
    expect(validarConfig(mezclarConfig(CONFIG_POR_DEFECTO, json))).toEqual([]);
  });
  it('el config.json publicado lee el Excel real por su enlace, con Files.Read.All, oculta moneda y muestra MONTO TOTAL', () => {
    const json = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../public/config.json'), 'utf8'));
    expect(json.modo).toBe('microsoft');
    expect(json.datos.fuente).toBe('graph');
    expect(json.datos.urlCompartida).toMatch(
      /^https:\/\/jaicoscorp\.sharepoint\.com\/:x:\/r\/_layouts\/15\/Doc\.aspx\?sourcedoc=%7BE20FAA1A-1E42-416B-BA9F-A6FCF00E07C8%7D&file=centros-negocio-aic\.xlsx/,
    );
    expect(json.microsoft.scopes).toEqual(['User.Read', 'Files.Read.All']);
    expect(json.columnasOcultas).toEqual(['moneda']);
  });
  it('por defecto se ocultan moneda y monto, y "estado" es un campo conocido (no obligatorio)', () => {
    expect(CONFIG_POR_DEFECTO.columnasOcultas).toEqual(['moneda', 'monto']);
    expect(CONFIG_POR_DEFECTO.columnas.estado).toContain('estado de la orden');
    expect(CONFIG_POR_DEFECTO.camposObligatorios).not.toContain('estado');
    expect(validarConfig(mezclarConfig(CONFIG_POR_DEFECTO, { camposObligatorios: ['codigoCentro', 'estado'] }))).toEqual([]);
    expect(validarConfig(mezclarConfig(CONFIG_POR_DEFECTO, { columnasOcultas: [] }))).toEqual([]);
  });
  it('modo microsoft exige clientId', () => {
    const errores = validarConfig(mezclarConfig(CONFIG_POR_DEFECTO, { modo: 'microsoft' }));
    expect(errores.join(' ')).toMatch(/clientId/);
  });
  it('fuente graph exige enlace del Excel y modo microsoft', () => {
    const errores = validarConfig(mezclarConfig(CONFIG_POR_DEFECTO, { datos: { fuente: 'graph' } }));
    expect(errores.join(' ')).toMatch(/modo debe ser "microsoft"/);
    expect(errores.join(' ')).toMatch(/urlCompartida/);
  });
  it('"datos.urlCompartida" debe ser una dirección https completa', () => {
    const base = { modo: 'microsoft', microsoft: { clientId: GUID, tenantId: GUID } };
    const mal = mezclarConfig(CONFIG_POR_DEFECTO, { ...base, datos: { fuente: 'graph', urlCompartida: 'jaicoscorp.sharepoint.com/x' } });
    expect(validarConfig(mal).join(' ')).toMatch(/urlCompartida" debe ser una dirección completa/);
    const doc = 'https://jaicoscorp.sharepoint.com/:x:/r/_layouts/15/Doc.aspx?sourcedoc=%7BE20FAA1A-1E42-416B-BA9F-A6FCF00E07C8%7D&file=a.xlsx';
    expect(validarConfig(mezclarConfig(CONFIG_POR_DEFECTO, { ...base, datos: { fuente: 'graph', urlCompartida: doc } }))).toEqual([]);
  });
  it('configuración completa de producción es válida', () => {
    const c = mezclarConfig(CONFIG_POR_DEFECTO, {
      modo: 'microsoft',
      microsoft: { clientId: GUID, tenantId: GUID },
      datos: { fuente: 'graph', urlCompartida: 'https://ejemplo.sharepoint.com/:x:/s/Demo/abc' },
    });
    expect(validarConfig(c)).toEqual([]);
  });
  it('modo microsoft exige tenantId (la app es de inquilino único: sin él, error AADSTS50194)', () => {
    const errores = validarConfig(mezclarConfig(CONFIG_POR_DEFECTO, { modo: 'microsoft', microsoft: { clientId: GUID } }));
    expect(errores.join(' ')).toMatch(/microsoft\.tenantId/);
    expect(errores.join(' ')).toMatch(/AADSTS50194/);
  });
  it('"organizations" (multiinquilino a propósito) exige la lista de tenants', () => {
    const base = { modo: 'microsoft', microsoft: { clientId: GUID, tenantId: 'organizations' } };
    expect(validarConfig(mezclarConfig(CONFIG_POR_DEFECTO, base)).join(' ')).toMatch(/tenantsPermitidos/);
    const conLista = mezclarConfig(CONFIG_POR_DEFECTO, { ...base, microsoft: { ...base.microsoft, tenantsPermitidos: [GUID] } });
    expect(validarConfig(conLista)).toEqual([]);
  });
  it.each([
    [{ microsoft: { dominiosPermitidos: 'aic.pe' } }, /microsoft\.dominiosPermitidos" debe ser una lista/],
    [{ microsoft: { tenantsPermitidos: GUID } }, /microsoft\.tenantsPermitidos" debe ser una lista/],
    [{ microsoft: { scopes: 'User.Read' } }, /microsoft\.scopes/],
    [{ microsoft: { guardarSesion: 'cookies' } }, /guardarSesion/],
    [{ microsoft: { redirectUri: 'redirect.html' } }, /redirectUri/],
  ])('modo microsoft: tipo equivocado %j', (cambio: { microsoft: Record<string, unknown> }, mensaje: RegExp) => {
    const c = mezclarConfig(CONFIG_POR_DEFECTO, {
      modo: 'microsoft',
      ...cambio,
      microsoft: { clientId: GUID, tenantId: GUID, ...cambio.microsoft },
    });
    expect(validarConfig(c).join(' ')).toMatch(mensaje);
  });
  it.each([
    [{ columnas: { cliente: 'Cliente' } }, /columnas\.cliente" debe ser una lista/],
    [{ columnas: { proveedor: ['Proveedor'] } }, /columnas\.proveedor" no es un campo/],
    [{ camposObligatorios: ['codigo'] }, /camposObligatorios/],
    [{ filasPorPagina: 30 }, /filasPorPagina/],
    [{ filasPorPagina: '50' }, /filasPorPagina/],
    [{ autoActualizarMinutos: -1 }, /autoActualizarMinutos/],
    [{ autoActualizarMinutos: 'diez' }, /autoActualizarMinutos/],
    [{ datos: { filaEncabezado: 'dos' } }, /filaEncabezado/],
    [{ datos: { hoja: 3 } }, /datos\.hoja/],
    [{ datos: { rellenarHaciaAbajo: 'codigoCentro' } }, /rellenarHaciaAbajo/],
    [{ columnasOcultas: 'monto' }, /"columnasOcultas" debe ser una lista/],
    [{ columnasOcultas: ['monto', 3] }, /"columnasOcultas" debe ser una lista/],
    [{ titulo: ['x'] }, /"titulo"/],
  ])('tipo equivocado %j -> mensaje claro', (cambio: object, mensaje: RegExp) => {
    expect(validarConfig(mezclarConfig(CONFIG_POR_DEFECTO, cambio)).join(' ')).toMatch(mensaje);
  });
});

describe('revisarConfig (la única forma de pasar de "sin revisar" a Config)', () => {
  it('sin problemas: entrega la configuración (ya con el tipo Config)', () => {
    const sinValidar = mezclarConfig(CONFIG_POR_DEFECTO, { titulo: 'Otro', filasPorPagina: 25 });
    const r = revisarConfig(sinValidar);
    expect(r.valida).toBe(true);
    if (r.valida) {
      expect(r.config.titulo.toUpperCase()).toBe('OTRO');
      expect(r.config.filasPorPagina + 1).toBe(26);
    }
  });
  it('con problemas: solo entrega la lista de errores (no una Config)', () => {
    const r = revisarConfig(mezclarConfig(CONFIG_POR_DEFECTO, { filasPorPagina: '50', modo: 'otro' }));
    expect(r).toEqual({ valida: false, errores: expect.arrayContaining([expect.stringMatching(/filasPorPagina/), expect.stringMatching(/"modo"/)]) });
    expect('config' in r).toBe(false);
  });
});

describe('cargarConfig', () => {
  it('mezcla el JSON descargado con los valores por defecto', async () => {
    const c = await cargarConfig('config.json', async () => new Response(JSON.stringify({ titulo: 'X' })));
    expect(c.titulo).toBe('X');
    expect(c.filasPorPagina).toBe(50);
  });
  it('JSON mal escrito da un mensaje claro', async () => {
    await expect(cargarConfig('config.json', async () => new Response('{ "titulo": "X", }'))).rejects.toThrow(
      /no es JSON válido/,
    );
  });
  it('config.json que no es un grupo { … } da un mensaje claro', async () => {
    await expect(cargarConfig('config.json', async () => new Response('[]'))).rejects.toThrow(/debe empezar con \{/);
    await expect(cargarConfig('config.json', async () => new Response('"demo"'))).rejects.toThrow(/debe empezar con \{/);
  });
  it('archivo inexistente da un mensaje claro', async () => {
    await expect(cargarConfig('config.json', async () => new Response('', { status: 404 }))).rejects.toThrow(
      /No se encontró/,
    );
  });
});
