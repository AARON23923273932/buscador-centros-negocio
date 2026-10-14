// Rutas de la app (logica/rutas.ts) y detalle de un centro (logica/centro.ts): funciones puras.
import { describe, expect, it } from 'vitest';
import { buscarCentro, estadosDeCentro, mismoCodigo } from '../../src/logica/centro.ts';
import { prepararFila } from '../../src/logica/filtros.ts';
import {
  codigoDeRuta,
  codigoEnlazable,
  destinoCompatible,
  RUTA_CENTROS,
  RUTA_ORDENES,
  rutaDeVista,
  rutaDetalleCentro,
  rutaPublica,
  rutaVolver,
  vistaDeRuta,
} from '../../src/logica/rutas.ts';
import { filaDePrueba } from './ayuda.ts';

describe('rutas', () => {
  it('cada vista tiene su ruta y viceversa (con o sin "/" final, sin importar mayúsculas)', () => {
    expect(rutaDeVista('orden')).toBe(RUTA_ORDENES);
    expect(rutaDeVista('centro')).toBe(RUTA_CENTROS);
    expect(vistaDeRuta('/ordenes')).toBe('orden');
    expect(vistaDeRuta('/centros/')).toBe('centro');
    expect(vistaDeRuta('/Centros')).toBe('centro');
    expect(vistaDeRuta('/centros/A2338PY01')).toBeNull();
    expect(vistaDeRuta('/')).toBeNull();
  });

  it('el detalle codifica el código (espacios, "/", "#", "?", tildes)', () => {
    expect(rutaDetalleCentro('A2338PY01')).toBe('/centros/A2338PY01');
    expect(rutaDetalleCentro('CN/01 #A?')).toBe('/centros/CN%2F01%20%23A%3F');
    expect(decodeURIComponent(rutaDetalleCentro('Ñandú 1').split('/')[2] ?? '')).toBe('Ñandú 1');
  });

  it('el código del detalle se lee de la dirección decodificando UNA vez (un "%2F" escrito en el código no se vuelve "/")', () => {
    for (const codigo of ['A2338PY01', 'CN/01 #A?', '50%2F', '100%', 'Ñandú-ó', 'a+b&c', ' . ']) {
      expect(codigoDeRuta(rutaDetalleCentro(codigo)), codigo).toBe(codigo);
    }
    expect(codigoDeRuta('/centros/50%252F')).toBe('50%2F'); // React Router (useParams) daría "50/"
    expect(codigoDeRuta('/Centros/CN-0005/')).toBe('CN-0005'); // con "/" final o mayúsculas (React Router la acepta)
    expect(codigoDeRuta('/centros/%C3%B1and%C3%BA')).toBe('ñandú'); // pegada en el navegador sin codificar
    expect(codigoDeRuta('/centros/50%')).toBe('50%'); // "%" suelto: tal cual, sin error
    // No es un detalle.
    expect(codigoDeRuta('/centros')).toBeNull();
    expect(codigoDeRuta('/centros/')).toBeNull();
    expect(codigoDeRuta('/centros/A/extra')).toBeNull();
    expect(codigoDeRuta('/ordenes/A')).toBeNull();
  });

  it('"." y ".." no pueden ir en una dirección (el navegador los toma como carpetas): esos códigos van sin enlace', () => {
    expect(codigoEnlazable('.')).toBe(false);
    expect(codigoEnlazable('..')).toBe(false);
    for (const codigo of ['A2338PY01', '...', '.5', 'CN.01', '%2E']) expect(codigoEnlazable(codigo), codigo).toBe(true);
  });

  it('"/" lleva a /ordenes con la misma búsqueda; ?vista=centro (enlaces viejos) lleva a /centros', () => {
    expect(destinoCompatible('/', '')).toEqual({ pathname: '/ordenes', search: '' });
    expect(destinoCompatible('/', '?q=cableado&estado=Abierta')).toEqual({ pathname: '/ordenes', search: '?q=cableado&estado=Abierta' });
    expect(destinoCompatible('/', '?q=cableado&vista=centro&tam=25')).toEqual({ pathname: '/centros', search: '?q=cableado&tam=25' });
    expect(destinoCompatible('/index.html', '?vista=centro')).toEqual({ pathname: '/centros', search: '' });
    expect(destinoCompatible('/ordenes', '?vista=centro&q=x')).toEqual({ pathname: '/centros', search: '?q=x' });
    // ?vista=orden u otro valor: se quita, la ruta se queda.
    expect(destinoCompatible('/ordenes', '?vista=orden&q=x')).toEqual({ pathname: '/ordenes', search: '?q=x' });
    expect(destinoCompatible('/centros/', '?vista=otra')).toEqual({ pathname: '/centros', search: '' });
  });

  it('sin nada que corregir no redirige (listas sin ?vista, detalle, otras rutas)', () => {
    expect(destinoCompatible('/ordenes', '?q=x')).toBeNull();
    expect(destinoCompatible('/centros', '')).toBeNull();
    expect(destinoCompatible('/centros/A2338PY01', '?vista=centro')).toBeNull();
    expect(destinoCompatible('/no-existe', '?vista=centro')).toBeNull();
  });

  it('"Volver" va a la lista desde la que se abrió el detalle; si no se sabe, a /centros', () => {
    expect(rutaVolver({ desde: '/ordenes' })).toBe('/ordenes');
    expect(rutaVolver({ desde: '/centros/' })).toBe('/centros');
    expect(rutaVolver(null)).toBe('/centros');
    expect(rutaVolver({ desde: '/centros/A1' })).toBe('/centros'); // no es una lista
    expect(rutaVolver({ desde: 'https://otro.sitio/' })).toBe('/centros');
    expect(rutaVolver('cualquier cosa')).toBe('/centros');
  });

  it('archivos publicados: siempre desde la carpeta de la app (no desde la ruta actual)', () => {
    expect(rutaPublica('config.json')).toBe('/config.json'); // base "/" (vite.config.ts)
    expect(rutaPublica('datos/centros-ejemplo.xlsx')).toBe('/datos/centros-ejemplo.xlsx');
    expect(rutaPublica('./config.json', '/app/')).toBe('/app/config.json');
    expect(rutaPublica('config.json', '/app')).toBe('/app/config.json');
    // Direcciones completas o que ya empiezan con "/": tal cual.
    expect(rutaPublica('/datos/x.xlsx', '/app/')).toBe('/datos/x.xlsx');
    expect(rutaPublica('https://ejemplo.test/x.xlsx')).toBe('https://ejemplo.test/x.xlsx');
  });
});

describe('detalle de un centro (buscarCentro)', () => {
  const FILAS = [
    filaDePrueba(2, { codigoCentro: 'A2338PY01', descripcionCentro: 'Centro A', cliente: 'Cliente 1', ordenCompra: 'OC N° 45001 OC N° 45002', estado: 'Abierta' }),
    filaDePrueba(3, { codigoCentro: 'B100', descripcionCentro: 'Centro B', cliente: 'Cliente 2', ordenCompra: 'OC-9', estado: 'Cerrada' }),
    filaDePrueba(4, { codigoCentro: 'a2338py01', descripcionCentro: 'Centro A', cliente: 'Cliente 3', ordenCompra: 'OS-7', estado: 'abierta' }),
    filaDePrueba(5, { codigoCentro: 'A2338PY01', descripcionCentro: 'Centro A', cliente: 'Cliente 1', ordenCompra: 'OS-8', estado: 'Cerrada' }),
  ].map(prepararFila);

  it('mismoCodigo: compara como buscarCentro (al volver del detalle se busca el enlace de ese centro)', () => {
    expect(mismoCodigo('A2338PY01', ' a2338py01 ')).toBe(true);
    expect(mismoCodigo('CN-0005', 'CN-0006')).toBe(false);
  });

  it('junta TODAS las filas del centro, sin importar mayúsculas ni espacios de más', () => {
    const g = buscarCentro(FILAS, '  a2338PY01 ');
    expect(g?.codigo).toBe('A2338PY01');
    expect(g?.filas.map((f) => f.id)).toEqual([2, 4, 5]);
    expect(g?.clientes).toEqual(['Cliente 1', 'Cliente 3']);
    expect(g?.ordenes).toBe(3); // una celda con varias órdenes juntas cuenta como una (igual que "Por centro")
  });

  it('estados distintos, sin repetir (como el desplegable "Estado")', () => {
    expect(estadosDeCentro(buscarCentro(FILAS, 'A2338PY01')!)).toEqual(['Abierta', 'Cerrada']);
  });

  it('un código que no existe (o vacío) no encuentra nada', () => {
    expect(buscarCentro(FILAS, 'ZZZ')).toBeNull();
    expect(buscarCentro(FILAS, '')).toBeNull();
    expect(buscarCentro(FILAS, '   ')).toBeNull();
  });
});
