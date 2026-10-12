// =============================================================================
// generar-ejemplo.mjs — Crea public/datos/centros-ejemplo.xlsx con DATOS FICTICIOS.
//
// Uso:  npm run generar-ejemplo
//
// El archivo imita un Excel "desordenado" como el que podría dejar un bot, para
// probar que la app aguanta: título en la fila 1 y encabezados en la fila 2,
// filas vacías, celdas combinadas, fechas guardadas como número, números
// guardados como texto, ceros a la izquierda, espacios de más y tildes.
// Ningún dato corresponde a clientes ni proyectos reales.
// =============================================================================

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx/xlsx.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const destino = resolve(aqui, '..', 'public', 'datos', 'centros-ejemplo.xlsx');

// Generador de números "al azar" pero siempre igual (para que el archivo no cambie en cada ejecución).
let semilla = 20261009;
const azar = () => {
  semilla = (semilla * 1103515245 + 12345) % 2147483648;
  return semilla / 2147483648;
};
const elegir = (lista) => lista[Math.floor(azar() * lista.length)];

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

// Fecha de Excel = días desde el 30/12/1899.
const serialExcel = (anio, mes, dia) => (Date.UTC(anio, mes - 1, dia) - Date.UTC(1899, 11, 30)) / 86400000;

const hoja = {};
const combinadas = [];
const poner = (r, c, celda) => {
  hoja[XLSX.utils.encode_cell({ r, c })] = celda;
};

// Fila 1: título (combinado de A1 a I1). Fila 2: encabezados.
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
  // La mayoría de centros tiene 1 a 3 órdenes; el centro 8 tiene 4 y el 5 tiene 3 combinadas.
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
    // Espacios de más en algunos clientes (el bot a veces los deja).
    poner(fila, 2, { t: 's', v: centro % 7 === 3 ? `  ${cliente}  ` : cliente });

    const sinOrden = centro === 12; // centro recién creado: todavía sin orden
    if (!sinOrden) {
      const esServicio = azar() < 0.35;
      if (esServicio) {
        poner(fila, 3, { t: 's', v: `OS-2026-${String(numeroOS++).padStart(4, '0')}` });
        poner(fila, 4, { t: 's', v: 'Servicio' });
      } else if (centro % 9 === 0) {
        // Número de OC guardado como TEXTO con ceros a la izquierda.
        poner(fila, 3, { t: 's', v: String(numeroOC++).padStart(10, '0') });
        poner(fila, 4, { t: 's', v: 'Compra' });
      } else {
        // Número de OC guardado como NÚMERO, con formato que muestra ceros a la izquierda.
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
        // Monto guardado como TEXTO (pasa cuando se pega desde otro sistema).
        poner(fila, 6, { t: 's', v: monto.toLocaleString('en-US', { minimumFractionDigits: 2 }) });
      } else {
        poner(fila, 6, { t: 'n', v: monto, z: '#,##0.00' });
      }
      poner(fila, 7, { t: 's', v: azar() < 0.75 ? 'PEN' : 'USD' });
    }
    poner(fila, 8, { t: 's', v: sinOrden ? 'Sin orden aún' : elegir(ESTADOS) });

    fila += 1;
    filasDatos += 1;

    // Filas vacías en medio de los datos (y una con solo un espacio).
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
