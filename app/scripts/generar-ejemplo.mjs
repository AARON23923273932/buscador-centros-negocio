import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx/xlsx.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const destino = resolve(aqui, '..', 'public', 'datos', 'centros-ejemplo.xlsx');

let semilla = 20261009;
const azar = () => {
  semilla = (semilla * 1103515245 + 12345) % 2147483648;
  return semilla / 2147483648;
};
/** @type {<T>(lista: readonly T[]) => T} */
const elegir = (lista) => /** @type {(typeof lista)[number]} */ (lista[Math.floor(azar() * lista.length)]);

const CLIENTES = [
  'Cliente Demo A S.A.C.',
  'Cliente Demo B S.A.',
  'Constructora Ejemplo Andina S.A.C.',
  'Minera Ficticia del Sur S.A.',
  'Clínica Demo Esperanza',
  'Corporación Ejemplo Perú S.A.C.',
  'Inmobiliaria Demo Ñandú E.I.R.L.',
  'Servicios & Mantenimiento Demo S.R.L.',
];

const DESCRIPCIONES = [
  'Instalación de red de datos – Sede Demo {n}',
  'Mantenimiento eléctrico preventivo – Local {n}',
  'Cableado estructurado oficina piso {n}',
  'Implementación de cámaras de videovigilancia (ejemplo {n})',
  'Tendido de fibra óptica – Tramo demo {n}',
  'Soporte técnico mensual – Contrato ejemplo {n}',
  'Ampliación de gabinete de comunicaciones {n}',
  'Suministro de equipos de red – Almacén demo {n}',
  'Certificación de puntos de red – Edificio {n}',
  'Migración de central telefónica (ejemplo {n})',
];

const ESTADOS = ['Abierta', 'En ejecución', 'Cerrada'];
const ENCABEZADOS = [
  'Código',
  'Descripción del centro de negocio',
  'Cliente',
  'N° Orden',
  'Tipo de orden',
  'Fecha de creación',
  'Monto',
  'Moneda',
  'Estado',
];

/**
 * @param {number} anio
 * @param {number} mes
 * @param {number} dia
 */
const serialExcel = (anio, mes, dia) => (Date.UTC(anio, mes - 1, dia) - Date.UTC(1899, 11, 30)) / 86400000;

/** @type {import('xlsx/xlsx.mjs').WorkSheet} */
const hoja = {};
/** @type {import('xlsx/xlsx.mjs').Range[]} */
const combinadas = [];
/**
 * @param {number} r
 * @param {number} c
 * @param {import('xlsx/xlsx.mjs').CellObject} celda
 */
const poner = (r, c, celda) => {
  hoja[XLSX.utils.encode_cell({ r, c })] = celda;
};

poner(0, 0, { t: 's', v: 'REPORTE DE CENTROS DE NEGOCIO — DATOS FICTICIOS DE EJEMPLO' });
combinadas.push({ s: { r: 0, c: 0 }, e: { r: 0, c: ENCABEZADOS.length - 1 } });
ENCABEZADOS.forEach((t, c) => poner(1, c, { t: 's', v: t }));

const TOTAL_FILAS = 80;
let fila = 2;
let filasDatos = 0;
let numeroOC = 4500100;
let numeroOS = 1;
let dia = 0;
let centro = 0;

while (filasDatos < TOTAL_FILAS) {
  centro += 1;
  const codigo = `CN-${String(centro).padStart(4, '0')}`;
  const descripcion = elegir(DESCRIPCIONES).replace('{n}', String(centro));
  const cliente = elegir(CLIENTES);
  let ordenes = centro === 8 ? 4 : centro === 5 ? 3 : 1 + Math.floor(azar() * 3);
  ordenes = Math.min(ordenes, TOTAL_FILAS - filasDatos);
  const combinar = centro === 5;
  if (combinar) {
    combinadas.push({ s: { r: fila, c: 0 }, e: { r: fila + ordenes - 1, c: 0 } });
    combinadas.push({ s: { r: fila, c: 1 }, e: { r: fila + ordenes - 1, c: 1 } });
  }

  for (let k = 0; k < ordenes; k++) {
    const primera = k === 0;
    if (!combinar || primera) {
      poner(fila, 0, { t: 's', v: codigo });
      poner(fila, 1, { t: 's', v: descripcion });
    }
    poner(fila, 2, { t: 's', v: centro % 7 === 3 ? `  ${cliente}  ` : cliente });

    const sinOrden = centro === 12;
    if (!sinOrden) {
      const esServicio = azar() < 0.35;
      if (esServicio) {
        poner(fila, 3, { t: 's', v: `OS-2026-${String(numeroOS++).padStart(4, '0')}` });
        poner(fila, 4, { t: 's', v: 'Servicio' });
      } else if (centro % 9 === 0) {
        poner(fila, 3, { t: 's', v: String(numeroOC++).padStart(10, '0') });
        poner(fila, 4, { t: 's', v: 'Compra' });
      } else {
        poner(fila, 3, { t: 'n', v: numeroOC++, z: '0000000000' });
        poner(fila, 4, { t: 's', v: 'Compra' });
      }
    }

    dia += 1 + Math.floor(azar() * 3);
    const fecha = new Date(Date.UTC(2026, 0, 5 + dia));
    poner(fila, 5, {
      t: 'n',
      v: serialExcel(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, fecha.getUTCDate()),
      z: 'dd/mm/yyyy',
    });

    if (!sinOrden) {
      const monto = Math.round((800 + azar() * 95000) * 100) / 100;
      if (filasDatos % 10 === 4) {
        poner(fila, 6, { t: 's', v: monto.toLocaleString('en-US', { minimumFractionDigits: 2 }) });
      } else {
        poner(fila, 6, { t: 'n', v: monto, z: '#,##0.00' });
      }
      poner(fila, 7, { t: 's', v: azar() < 0.75 ? 'PEN' : 'USD' });
    }
    poner(fila, 8, { t: 's', v: sinOrden ? 'Sin orden aún' : elegir(ESTADOS) });

    fila += 1;
    filasDatos += 1;

    if (filasDatos === 18) fila += 1;
    if (filasDatos === 47) {
      poner(fila, 0, { t: 's', v: ' ' });
      fila += 1;
    }
  }
}

hoja['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: fila - 1, c: ENCABEZADOS.length - 1 } });
hoja['!merges'] = combinadas;
hoja['!cols'] = [12, 46, 34, 14, 14, 16, 14, 9, 14].map((wch) => ({ wch }));

const libro = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(libro, hoja, 'Centros de negocio');

mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }));
console.log(`Listo: ${destino}`);
console.log(`  ${filasDatos} filas de datos, ${centro} centros de negocio, encabezados en la fila 2.`);
