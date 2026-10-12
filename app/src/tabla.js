// =============================================================================
// tabla.js — Arma el HTML de la tabla, la vista por centro y la paginación.
//
// Regla de oro: TODO dato que viene del Excel pasa por escaparHtml() o resaltar()
// antes de llegar a la página (evita que un texto raro se ejecute como código).
// =============================================================================

import { escaparHtml, resaltar } from './filtros.js';

const ICONO_COPIAR =
  '<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z"/></svg>';
const ICONO_FLECHA =
  '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" class="icono-expandir"><path fill="currentColor" d="M9 6l6 6-6 6-1.4-1.4L12.2 12 7.6 7.4 9 6Z"/></svg>';

const numero = (n) => Number(n).toLocaleString('es-PE');

/** Indicador de orden (▲ ▼) y valor de aria-sort para un encabezado. */
function estadoOrden(clave, ordenarPor, direccion) {
  if (clave !== ordenarPor) return { aria: 'none', icono: '↕', clase: '' };
  return direccion === 'desc'
    ? { aria: 'descending', icono: '▼', clase: ' activo' }
    : { aria: 'ascending', icono: '▲', clase: ' activo' };
}

function htmlEncabezadoOrdenable(clave, titulo, ordenarPor, direccion, clasesExtra = '') {
  const e = estadoOrden(clave, ordenarPor, direccion);
  const siguiente = e.aria === 'ascending' ? 'descendente' : 'ascendente';
  return (
    `<th scope="col" aria-sort="${e.aria}" class="${clasesExtra}">` +
    `<button type="button" class="btn-orden${e.clase}" data-orden="${escaparHtml(clave)}" ` +
    `title="Ordenar por ${escaparHtml(titulo)} (${siguiente})">` +
    `<span>${escaparHtml(titulo)}</span><span class="icono-orden" aria-hidden="true">${e.icono}</span>` +
    `</button></th>`
  );
}

/** Contenido de una celda. La del código de centro lleva el botón "copiar". */
export function htmlCelda(columna, celda, terminos) {
  const texto = celda?.t ?? '';
  const contenido = resaltar(texto, terminos);
  if (columna.campo === 'codigoCentro' && texto) {
    return (
      `<span class="celda-codigo"><span class="codigo">${contenido}</span>` +
      `<button type="button" class="btn-copiar" data-copiar="${escaparHtml(texto)}" ` +
      `aria-label="Copiar código ${escaparHtml(texto)}" title="Copiar código">${ICONO_COPIAR}</button></span>`
    );
  }
  return contenido;
}

function claseColumna(columna) {
  const clases = [];
  if (columna.tipo === 'numero') clases.push('num');
  if (columna.campo) clases.push(`campo-${columna.campo}`);
  if (columna.campo === 'descripcionCentro') clases.push('ancha');
  return clases.join(' ');
}

function htmlFilasDatos(columnas, filas, terminosDe) {
  return filas
    .map(
      (fila) =>
        `<tr data-fila="${fila.id}">` +
        columnas
          .map((col) => `<td class="${claseColumna(col)}">${htmlCelda(col, fila.celdas[col.indice], terminosDe(col))}</td>`)
          .join('') +
        '</tr>',
    )
    .join('');
}

function htmlSinResultados(colspan, hayDatos) {
  const mensaje = hayDatos
    ? 'No hay resultados con esa búsqueda o filtros. Prueba con menos palabras o pulsa “Limpiar filtros”.'
    : 'El Excel no tiene filas con datos todavía.';
  return `<tr class="fila-vacia"><td colspan="${colspan}">${escaparHtml(mensaje)}</td></tr>`;
}

/**
 * Tabla "Por orden": una fila por cada fila del Excel.
 * @param {object} p { columnas, filas, terminosDe(columna), ordenarPor, direccion, hayDatos }
 */
export function htmlTablaOrdenes({ columnas, filas, terminosDe, ordenarPor, direccion, hayDatos = true }) {
  if (!columnas.length) {
    return '<p class="tabla-vacia">El Excel no tiene columnas con datos.</p>';
  }
  const encabezado = columnas
    .map((c) => htmlEncabezadoOrdenable(c.clave, c.titulo, ordenarPor, direccion, claseColumna(c)))
    .join('');
  const cuerpo = filas.length ? htmlFilasDatos(columnas, filas, terminosDe) : htmlSinResultados(columnas.length, hayDatos);
  return (
    '<table class="tabla" id="tabla-resultados">' +
    '<caption class="solo-lectores">Resultados de la búsqueda. Pulsa un título de columna para ordenar.</caption>' +
    `<thead><tr>${encabezado}</tr></thead><tbody>${cuerpo}</tbody></table>`
  );
}

/**
 * Tabla "Por centro de negocio": una fila por centro que se expande para ver sus órdenes.
 * @param {object} p { grupos, columnas, terminosDe, terminos, expandidos:Set, ordenarPor, direccion, hayDatos }
 */
export function htmlTablaCentros({ grupos, columnas, terminosDe, terminos, expandidos, ordenarPor, direccion, hayDatos = true }) {
  const colCodigo = columnas.find((c) => c.campo === 'codigoCentro') || { campo: 'codigoCentro' };
  const colDescripcion = columnas.find((c) => c.campo === 'descripcionCentro') || { campo: 'descripcionCentro' };
  const enc =
    '<th scope="col" class="col-expandir"><span class="solo-lectores">Ver órdenes</span></th>' +
    htmlEncabezadoOrdenable('codigo', 'Código', ordenarPor, direccion) +
    htmlEncabezadoOrdenable('descripcion', 'Descripción', ordenarPor, direccion, 'ancha') +
    htmlEncabezadoOrdenable('cliente', 'Cliente(s)', ordenarPor, direccion) +
    htmlEncabezadoOrdenable('ordenes', 'N° de órdenes', ordenarPor, direccion, 'num');

  let cuerpo = '';
  if (!grupos.length) {
    cuerpo = htmlSinResultados(5, hayDatos);
  }
  grupos.forEach((g, i) => {
    const abierto = expandidos.has(g.clave);
    const idDetalle = `detalle-centro-${i}`;
    const nombre = g.codigo || g.descripcion || 'sin código';
    cuerpo +=
      `<tr class="fila-centro${abierto ? ' abierta' : ''}" data-grupo="${escaparHtml(g.clave)}">` +
      `<td class="col-expandir"><button type="button" class="btn-expandir" data-grupo="${escaparHtml(g.clave)}" ` +
      `aria-expanded="${abierto}"${abierto ? ` aria-controls="${idDetalle}"` : ''}>` +
      `${ICONO_FLECHA}<span class="solo-lectores">${abierto ? 'Ocultar' : 'Ver'} órdenes de ${escaparHtml(nombre)}</span></button></td>` +
      `<td>${htmlCelda(colCodigo, { t: g.codigo }, terminosDe(colCodigo))}</td>` +
      `<td class="ancha">${resaltar(g.descripcion, terminosDe(colDescripcion))}</td>` +
      `<td>${resaltar(g.clientes.join(', '), terminos)}</td>` +
      `<td class="num"><span class="insignia">${numero(g.ordenes)}</span></td></tr>`;
    if (abierto) {
      cuerpo +=
        `<tr class="fila-detalle" id="${idDetalle}"><td colspan="5"><div class="detalle-contenedor">` +
        `<table class="tabla tabla-anidada"><caption class="solo-lectores">Órdenes del centro ${escaparHtml(nombre)}</caption>` +
        `<thead><tr>${columnas.map((c) => `<th scope="col" class="${claseColumna(c)}">${escaparHtml(c.titulo)}</th>`).join('')}</tr></thead>` +
        `<tbody>${htmlFilasDatos(columnas, g.filas, terminosDe)}</tbody></table></div></td></tr>`;
    }
  });

  return (
    '<table class="tabla tabla-centros" id="tabla-resultados">' +
    '<caption class="solo-lectores">Centros de negocio. Pulsa la flecha de un centro para ver sus órdenes.</caption>' +
    `<thead><tr>${enc}</tr></thead><tbody>${cuerpo}</tbody></table>`
  );
}

/** Botones de paginación. */
export function htmlPaginacion(pag) {
  if (pag.total === 0) return '';
  const boton = (destino, texto, etiqueta, deshabilitado) =>
    `<button type="button" class="btn btn-pagina" data-pagina="${destino}" aria-label="${etiqueta}"${
      deshabilitado ? ' disabled' : ''
    }>${texto}</button>`;
  const primera = pag.pagina <= 1;
  const ultima = pag.pagina >= pag.totalPaginas;
  return (
    boton(1, '«', 'Primera página', primera) +
    boton(pag.pagina - 1, '‹ <span class="texto-boton">Anterior</span>', 'Página anterior', primera) +
    `<span class="pagina-actual">Página ${numero(pag.pagina)} de ${numero(pag.totalPaginas)}</span>` +
    boton(pag.pagina + 1, '<span class="texto-boton">Siguiente</span> ›', 'Página siguiente', ultima) +
    boton(pag.totalPaginas, '»', 'Última página', ultima)
  );
}

/** "Mostrando 1–50 de 63 resultados (de 80 en total)" */
export function textoContador(pag, totalGeneral, vista) {
  const unidad = vista === 'centro' ? ['centro', 'centros'] : ['resultado', 'resultados'];
  const nombre = pag.total === 1 ? unidad[0] : unidad[1];
  if (pag.total === 0) return `Sin ${unidad[1]} (de ${numero(totalGeneral)} en total)`;
  return `Mostrando ${numero(pag.desde)}–${numero(pag.hasta)} de ${numero(pag.total)} ${nombre} (de ${numero(totalGeneral)} en total)`;
}
