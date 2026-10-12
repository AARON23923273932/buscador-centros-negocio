// =============================================================================
// main.js — Arranque de la app y "pegamento" entre las piezas.
//
//   config.json ──► (login Microsoft) ──► descargar Excel ──► leer filas
//        ──► buscar / filtrar / ordenar / paginar ──► dibujar la tabla
//
// El "estado" (lo que el usuario buscó y filtró) vive en app.estado y se copia
// a la URL para poder compartir el enlace.
// =============================================================================

import './estilos.css';
import { cargarConfig, validarConfig } from './config.js';
import { descargarExcel, leerLibro } from './datos.js';
import { ErrorDatos, obtenerMetadatos } from './graph.js';
import {
  FILTROS_VACIOS,
  NOMBRES_CAMPOS,
  agruparPorCentro,
  contarFiltrosActivos,
  dividirTerminos,
  escaparHtml,
  filtrarFilas,
  normalizarTexto,
  ordenarFilas,
  ordenarGrupos,
  paginar,
  sePuedeFiltrar,
  valoresUnicos,
} from './filtros.js';
import { htmlPaginacion, htmlTablaCentros, htmlTablaOrdenes, textoContador } from './tabla.js';
import { TAMANOS_PAGINA, escribirEstadoEnUrl, leerEstadoDeUrl } from './estado-url.js';
import { iniciarTema } from './tema.js';

const $ = (selector) => document.querySelector(selector);

/** Filtros desplegables: [selector, clave del filtro, campo del Excel]. */
const DESPLEGABLES = [
  ['#f-cliente', 'cliente', 'cliente'],
  ['#f-tipo', 'tipo', 'tipoOrden'],
  ['#f-estado', 'estado', 'estado'],
];

const app = {
  config: null,
  sesion: null, // solo en modo "microsoft"
  datos: null, // resultado de leerLibro()
  archivo: null, // { modificado, nombre, eTag }
  estado: null,
  expandidos: new Set(), // centros abiertos en la vista "Por centro"
  cargando: false,
  ultimaConsulta: null, // Date de la última vez que se revisó el Excel
  totalCentros: 0,
  vistaActual: { filas: [], grupos: null },
};

// ---------------------------------------------------------------------------
// Utilidades de pantalla
// ---------------------------------------------------------------------------

function mostrarPantalla(id) {
  for (const p of ['pantalla-carga', 'pantalla-login', 'pantalla-mensaje', 'pantalla-app']) {
    $(`#${p}`).hidden = p !== id;
  }
}

const dos = (n) => String(n).padStart(2, '0');
const hora = (d) => `${dos(d.getHours())}:${dos(d.getMinutes())}`;
const fecha = (d) => `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;

let temporizadorAviso = null;
/** Mensaje corto flotante (ej. "Código copiado"). */
function avisar(texto) {
  const el = $('#aviso-flotante');
  el.textContent = texto;
  el.classList.add('visible');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => el.classList.remove('visible'), 2500);
}

function debounce(fn, ms = 200) {
  let t = null;
  const envuelta = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  envuelta.ahora = (...args) => {
    clearTimeout(t);
    fn(...args);
  };
  return envuelta;
}

/** Pantalla de mensaje (sin acceso, falta configuración, error grave). */
function mostrarMensaje(titulo, htmlCuerpo, acciones = []) {
  $('#mensaje-titulo').textContent = titulo;
  $('#mensaje-cuerpo').innerHTML = htmlCuerpo;
  const zona = $('#mensaje-acciones');
  zona.replaceChildren();
  for (const a of acciones) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${a.principal ? 'btn-primario' : 'btn-secundario'}`;
    b.textContent = a.texto;
    b.addEventListener('click', a.accion);
    zona.append(b);
  }
  mostrarPantalla('pantalla-mensaje');
  $('#mensaje-titulo').setAttribute('tabindex', '-1');
  $('#mensaje-titulo').focus();
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

async function arrancar() {
  // El botón ☀️/🌙 funciona en todas las pantallas (también antes de iniciar sesión).
  iniciarTema();
  try {
    app.config = await cargarConfig(new URL('config.json', document.baseURI).href);
  } catch (e) {
    mostrarMensaje('No se pudo iniciar la aplicación', `<p>${escaparHtml(e.message)}</p>`, [
      { texto: 'Reintentar', principal: true, accion: () => location.reload() },
    ]);
    return;
  }

  const { titulo, subtitulo } = app.config;
  if (titulo) {
    $('#titulo-app').textContent = titulo;
    document.title = titulo;
  }
  if (subtitulo) $('#subtitulo-app').textContent = subtitulo;

  const errores = validarConfig(app.config);
  if (errores.length) {
    mostrarMensaje(
      'Falta configurar la aplicación',
      '<p>Quien administra la aplicación debe revisar el archivo <code>config.json</code> ' +
        '(ver la guía <strong>GUIA-CONFIGURACION-MICROSOFT.md</strong>):</p>' +
        `<ul class="lista-errores">${errores.map((e) => `<li>${escaparHtml(e)}</li>`).join('')}</ul>`,
    );
    return;
  }

  if (app.config.modo === 'microsoft') {
    const listo = await prepararMicrosoft();
    if (!listo) return;
  } else {
    $('#zona-usuario').hidden = false;
    $('#insignia-demo').hidden = false;
    $('#aviso-demo').hidden = false;
  }
  iniciarApp();
}

/** Login con Microsoft. Devuelve true si la persona puede entrar. */
async function prepararMicrosoft() {
  const ms = app.config.microsoft;
  try {
    const { iniciarMicrosoft } = await import('./auth.js');
    app.sesion = await iniciarMicrosoft(ms);
  } catch (e) {
    console.error(e);
    mostrarMensaje(
      'No se pudo preparar el inicio de sesión',
      '<p>Revisa tu conexión a internet y vuelve a intentar. Si el problema sigue, avisa al administrador.</p>',
      [{ texto: 'Reintentar', principal: true, accion: () => location.reload() }],
    );
    return false;
  }

  const sesion = app.sesion;

  if (sesion.estado === 'sin-sesion') {
    if (sesion.errorLogin) {
      $('#error-login').textContent = sesion.errorLogin;
      $('#error-login').hidden = false;
    }
    $('#btn-login').addEventListener('click', async () => {
      $('#btn-login').disabled = true;
      try {
        await sesion.iniciarSesion();
      } catch (e) {
        console.error(e);
        $('#btn-login').disabled = false;
        $('#error-login').textContent = 'No se pudo abrir el inicio de sesión de Microsoft. Vuelve a intentarlo.';
        $('#error-login').hidden = false;
      }
    });
    mostrarPantalla('pantalla-login');
    $('#btn-login').focus();
    return false;
  }

  if (sesion.estado === 'denegado') {
    mostrarMensaje(
      'Tu cuenta no tiene acceso',
      `<p>Entraste como <strong>${escaparHtml(sesion.correo || 'una cuenta desconocida')}</strong>.</p>` +
        `<p>${escaparHtml(sesion.motivo)}</p>` +
        '<p>Si crees que es un error, pide acceso a tu jefe o al área de sistemas.</p>',
      [
        { texto: 'Usar otra cuenta', principal: true, accion: () => sesion.iniciarSesion() },
        { texto: 'Cerrar sesión', accion: () => sesion.cerrarSesion() },
      ],
    );
    return false;
  }

  // Permitido: mostrar quién es.
  $('#zona-usuario').hidden = false;
  $('#datos-usuario').hidden = false;
  $('#nombre-usuario').textContent = sesion.nombre;
  $('#correo-usuario').textContent = sesion.correo;
  $('#iniciales-usuario').textContent = iniciales(sesion.nombre || sesion.correo);
  $('#btn-cerrar-sesion').addEventListener('click', () => sesion.cerrarSesion());
  if (sesion.errorLogin) mostrarError(sesion.errorLogin);
  return true;
}

function iniciales(texto) {
  const partes = String(texto).replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  return (partes[0]?.[0] || '?').toUpperCase() + (partes[1]?.[0] || '').toUpperCase();
}

// ---------------------------------------------------------------------------
// Aplicación principal
// ---------------------------------------------------------------------------

function iniciarApp() {
  const porDefecto = TAMANOS_PAGINA.includes(Number(app.config.filasPorPagina)) ? Number(app.config.filasPorPagina) : 50;
  app.estado = leerEstadoDeUrl(location.search, porDefecto);
  app.tamanoPorDefecto = porDefecto;

  const tamanos = [...new Set([...TAMANOS_PAGINA, app.estado.tamano])].sort((a, b) => a - b);
  $('#tam-pagina').innerHTML = tamanos.map((n) => `<option value="${n}">${n}</option>`).join('');

  copiarEstadoAControles();
  conectarEventos();
  ajustarTextoBuscador();
  mostrarPantalla('pantalla-app');
  cargarDatos('inicial');
  programarAutoActualizacion();
}

/** En celulares el texto de ayuda del buscador es más corto para que se lea completo. */
function ajustarTextoBuscador() {
  const consulta = window.matchMedia('(max-width: 719px)');
  const aplicar = () => {
    $('#buscador').placeholder = consulta.matches
      ? 'Código, cliente, orden…'
      : 'Buscar por código, descripción, cliente u orden…';
  };
  aplicar();
  consulta.addEventListener('change', aplicar);
}

function copiarEstadoAControles() {
  const e = app.estado;
  $('#buscador').value = e.q;
  $('#btn-borrar-busqueda').hidden = !e.q;
  $('#f-codigo').value = e.codigo;
  $('#f-descripcion').value = e.descripcion;
  $('#f-orden').value = e.orden;
  ponerValorSelect($('#f-cliente'), e.cliente);
  ponerValorSelect($('#f-tipo'), e.tipo);
  ponerValorSelect($('#f-estado'), e.estado);
  $('#tam-pagina').value = String(e.tamano);
  for (const r of document.querySelectorAll('input[name="vista"]')) r.checked = r.value === e.vista;
}

/** Elige un valor en un <select>; si no existe la opción, la agrega (ej. viene de un enlace). */
function ponerValorSelect(select, valor) {
  if (valor && ![...select.options].some((o) => o.value === valor)) {
    const op = document.createElement('option');
    op.value = valor;
    op.textContent = valor;
    select.append(op);
  }
  select.value = valor || '';
}

function conectarEventos() {
  const e = () => app.estado;
  const alCambiarFiltro = () => {
    e().pagina = 1;
    dibujar();
  };

  // Buscador global (espera 200 ms después de la última tecla).
  const buscar = debounce(() => {
    e().q = $('#buscador').value;
    alCambiarFiltro();
  }, 200);
  $('#buscador').addEventListener('input', () => {
    $('#btn-borrar-busqueda').hidden = !$('#buscador').value;
    buscar();
  });
  $('#form-busqueda').addEventListener('submit', (ev) => {
    ev.preventDefault();
    buscar.ahora();
  });
  $('#btn-borrar-busqueda').addEventListener('click', () => {
    $('#buscador').value = '';
    $('#btn-borrar-busqueda').hidden = true;
    buscar.ahora();
    $('#buscador').focus();
  });

  // Filtros de texto ("contiene").
  for (const [id, clave] of [
    ['#f-codigo', 'codigo'],
    ['#f-descripcion', 'descripcion'],
    ['#f-orden', 'orden'],
  ]) {
    const aplicar = debounce(() => {
      e()[clave] = $(id).value;
      alCambiarFiltro();
    }, 200);
    $(id).addEventListener('input', aplicar);
    $(id).addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') aplicar.ahora();
    });
  }
  // Filtros desplegables (se elige una de las opciones que hay en el Excel).
  for (const [id, clave] of DESPLEGABLES) {
    $(id).addEventListener('change', () => {
      e()[clave] = $(id).value;
      alCambiarFiltro();
    });
  }

  $('#btn-limpiar').addEventListener('click', limpiarFiltros);

  // "Saltar a la paginación": con teclado, evita pasar por todos los botones de la tabla.
  $('#btn-saltar-paginacion').addEventListener('click', () => {
    const destino = document.querySelector('#paginacion .btn-pagina:not([disabled])') || $('.pagina-actual');
    if (destino) {
      if (!destino.matches('button')) destino.tabIndex = -1;
      destino.focus();
    } else {
      $('#buscador').focus();
    }
  });

  $('#btn-mostrar-filtros').addEventListener('click', () => {
    const panel = $('#panel-filtros');
    const abierto = panel.classList.toggle('abierto');
    $('#btn-mostrar-filtros').setAttribute('aria-expanded', String(abierto));
  });

  for (const radio of document.querySelectorAll('input[name="vista"]')) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      e().vista = radio.value;
      e().ordenarPor = '';
      e().direccion = 'asc';
      e().pagina = 1;
      dibujar();
    });
  }

  $('#tam-pagina').addEventListener('change', () => {
    e().tamano = Number($('#tam-pagina').value);
    e().pagina = 1;
    dibujar();
  });

  $('#paginacion').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-pagina]');
    if (!b || b.disabled) return;
    e().pagina = Number(b.dataset.pagina);
    dibujar();
    $('#contenedor-tabla').scrollTop = 0;
  });

  $('#contenedor-tabla').addEventListener('click', alHacerClicEnTabla);

  $('#btn-actualizar').addEventListener('click', () => cargarDatos('manual'));
  $('#btn-exportar').addEventListener('click', exportar);

  // Atajo: "/" lleva al buscador.
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== '/' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const t = ev.target;
    if (t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
    ev.preventDefault();
    $('#buscador').focus();
    $('#buscador').select();
  });
}

function limpiarFiltros() {
  Object.assign(app.estado, FILTROS_VACIOS, { pagina: 1 });
  copiarEstadoAControles();
  dibujar();
  // El botón "Limpiar filtros" queda desactivado: el foco pasa al buscador para no perder el lugar.
  $('#buscador').focus();
  avisar('Filtros limpiados');
}

function alHacerClicEnTabla(ev) {
  const orden = ev.target.closest('.btn-orden');
  if (orden) {
    const clave = orden.dataset.orden;
    const e = app.estado;
    if (e.ordenarPor === clave) e.direccion = e.direccion === 'asc' ? 'desc' : 'asc';
    else {
      e.ordenarPor = clave;
      e.direccion = 'asc';
    }
    e.pagina = 1;
    dibujar();
    return;
  }
  const copiar = ev.target.closest('.btn-copiar');
  if (copiar) {
    ev.stopPropagation();
    copiarTexto(copiar.dataset.copiar);
    return;
  }
  const filaCentro = ev.target.closest('.fila-centro');
  if (filaCentro && (ev.target.closest('.btn-expandir') || !ev.target.closest('button, a, input, select'))) {
    const clave = filaCentro.dataset.grupo;
    if (app.expandidos.has(clave)) app.expandidos.delete(clave);
    else app.expandidos.add(clave);
    dibujar();
  }
}

async function copiarTexto(texto) {
  let ok = false;
  try {
    await navigator.clipboard.writeText(texto);
    ok = true;
  } catch {
    // Plan B para navegadores sin permiso de portapapeles.
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.className = 'solo-lectores';
    document.body.append(area);
    area.select();
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
  }
  avisar(ok ? `Código ${texto} copiado` : 'No se pudo copiar. Selecciona el código y usa Ctrl+C.');
}

// ---------------------------------------------------------------------------
// Carga de datos
// ---------------------------------------------------------------------------

function ponerCargando(activo, motivo) {
  const boton = $('#btn-actualizar');
  // aria-disabled (y no "disabled") para que el botón no pierda el foco del teclado mientras carga.
  boton.setAttribute('aria-disabled', String(activo));
  boton.classList.toggle('girando', activo);
  $('#texto-btn-actualizar').textContent = activo ? 'Actualizando…' : 'Actualizar';
  $('#contenedor-tabla').setAttribute('aria-busy', String(activo));
  if (activo && !app.datos && motivo !== 'auto') {
    $('#contenedor-tabla').innerHTML =
      '<div class="estado-tabla"><span class="spinner" aria-hidden="true"></span> Cargando datos del Excel…</div>';
  }
}

/**
 * Descarga y lee el Excel. motivo: 'inicial' | 'manual' | 'auto'.
 * En "auto" (cada N minutos) primero revisa si el Excel cambió, para no descargarlo por gusto.
 */
async function cargarDatos(motivo) {
  if (app.cargando) return;
  app.cargando = true;
  ponerCargando(true, motivo);
  const cfg = app.config;
  const obtenerToken = app.sesion ? () => app.sesion.obtenerToken({ interactivo: motivo !== 'auto' }) : null;
  try {
    if (motivo === 'auto' && cfg.datos.fuente === 'graph' && app.archivo?.eTag) {
      const meta = await obtenerMetadatos(cfg.datos, await obtenerToken());
      if (meta.eTag && meta.eTag === app.archivo.eTag) {
        app.ultimaConsulta = new Date();
        ocultarError();
        textoActualizado();
        return;
      }
    }
    const archivo = await descargarExcel(cfg, obtenerToken);
    const datos = leerLibro(archivo.contenido, {
      hoja: cfg.datos.hoja,
      filaEncabezado: cfg.datos.filaEncabezado,
      columnas: cfg.columnas,
      camposObligatorios: cfg.camposObligatorios,
      rellenarHaciaAbajo: cfg.datos.rellenarHaciaAbajo,
      columnasOcultas: cfg.columnasOcultas,
    });
    app.datos = datos;
    app.archivo = {
      modificado: archivo.modificado,
      nombre: archivo.nombre,
      eTag: archivo.eTag,
      // Solo con el Excel de SharePoint/OneDrive: dónde se encontró (para fijarlo en config.json).
      driveId: archivo.driveId || null,
      itemId: archivo.itemId || null,
      origen: archivo.origen || null,
    };
    app.ultimaConsulta = new Date();
    app.totalCentros = agruparPorCentro(datos.filas).length;
    ocultarError();
    prepararControlesSegunColumnas();
    mostrarInfoColumnas();
    textoActualizado();
    dibujar();
    if (motivo === 'manual') avisar('Datos actualizados');
  } catch (e) {
    console.error('Error al cargar el Excel:', e);
    mostrarErrorDeCarga(e);
  } finally {
    app.cargando = false;
    ponerCargando(false);
  }
}

function textoActualizado() {
  const partes = [];
  if (app.ultimaConsulta) partes.push(`Datos actualizados a las ${hora(app.ultimaConsulta)}`);
  const mod = app.archivo?.modificado;
  if (mod) partes.push(`Excel modificado el ${fecha(mod)} a las ${hora(mod)}`);
  const min = Number(app.config.autoActualizarMinutos);
  if (min > 0) partes.push(`se actualiza solo cada ${min} min`);
  $('#texto-actualizado').textContent = partes.join(' · ');
}

function mostrarError(mensaje, acciones = []) {
  const caja = $('#aviso-error');
  caja.replaceChildren();
  const p = document.createElement('span');
  p.textContent = mensaje;
  caja.append(p);
  for (const a of acciones) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-secundario btn-pequeno';
    b.textContent = a.texto;
    b.addEventListener('click', a.accion);
    caja.append(' ', b);
  }
  caja.hidden = false;
}

function ocultarError() {
  $('#aviso-error').hidden = true;
}

function mostrarErrorDeCarga(error) {
  const mensaje =
    error instanceof ErrorDatos ? error.message : 'Ocurrió un error inesperado al leer el Excel. Vuelve a intentar.';
  const acciones = [{ texto: 'Reintentar', accion: () => cargarDatos('manual') }];
  if (error instanceof ErrorDatos && ['sesion', 'consentimiento'].includes(error.tipo) && app.sesion) {
    // Si faltaba aprobar Files.Read.All, al volver a entrar se pide de una vez (no solo el inicio de sesión).
    const todosLosPermisos = error.tipo === 'consentimiento';
    acciones.unshift({ texto: 'Volver a iniciar sesión', accion: () => app.sesion.iniciarSesion({ todosLosPermisos }) });
  }
  if (app.datos && app.ultimaConsulta) {
    mostrarError(`No se pudo actualizar: ${mensaje} Se siguen mostrando los datos de las ${hora(app.ultimaConsulta)}.`, acciones);
  } else {
    mostrarError(mensaje, acciones);
    $('#contenedor-tabla').innerHTML =
      '<div class="estado-tabla estado-error">No hay datos para mostrar. Revisa el mensaje de arriba.</div>';
    $('#texto-actualizado').textContent = 'No se pudieron cargar los datos.';
    $('#btn-exportar').disabled = true;
  }
}

/** Avisa si faltan columnas (o si el Excel tiene algo raro) y desactiva los filtros que no se pueden usar. */
function prepararControlesSegunColumnas() {
  const { mapa, faltantes, filas, columnas, hojas, hoja, formulasSinCalcular } = app.datos;
  const aviso = $('#aviso-columnas');
  const partes = [];
  if (faltantes.length) {
    const encontrados = columnas.map((c) => `${c.letra}: ${c.titulo}`).join(' · ') || '(ninguno)';
    partes.push(
      `<strong>No se encontraron estas columnas en el Excel:</strong> ${faltantes.map((f) => escaparHtml(f.nombre)).join(', ')}. ` +
        'Los filtros de esas columnas están desactivados. Revisa los títulos del Excel o agrega el nombre en la sección ' +
        '"columnas" de config.json.' +
        `<br><small>Títulos encontrados (hoja "${escaparHtml(hoja)}", fila ${escaparHtml(app.datos.filaEncabezado ?? '–')}): ${escaparHtml(encontrados)}` +
        (hojas.length > 1
          ? `<br>Hojas del Excel: ${escaparHtml(hojas.join(', '))}. Si los datos están en otra, ponla en "datos.hoja" de config.json.`
          : '') +
        '</small>',
    );
  }
  if (formulasSinCalcular > 0) {
    partes.push(
      `<strong>${formulasSinCalcular.toLocaleString('es-PE')} celda(s) del Excel tienen una fórmula sin resultado guardado</strong> y se ven vacías. ` +
        'Si deberían tener datos: abrir el Excel en Excel y guardarlo, o pedir que el bot escriba valores en vez de fórmulas.',
    );
  }
  aviso.innerHTML = partes.join('<hr class="separador-aviso">');
  aviso.hidden = partes.length === 0;

  const controles = {
    cliente: ['#f-cliente', 'cliente'],
    codigoCentro: ['#f-codigo', 'codigo'],
    descripcionCentro: ['#f-descripcion', 'descripcion'],
    ordenCompra: ['#f-orden', 'orden'],
    tipoOrden: ['#f-tipo', 'tipo'],
    estado: ['#f-estado', 'estado'],
  };
  for (const [campo, [selector, clave]] of Object.entries(controles)) {
    const sirve = sePuedeFiltrar(campo, mapa, filas);
    const control = $(selector);
    control.disabled = !sirve;
    control.title = sirve ? '' : campo in mapa ? 'Esta columna del Excel está vacía' : 'No se encontró esta columna en el Excel';
    if (!sirve) {
      app.estado[clave] = '';
      control.value = '';
    }
  }
  // Tipo de orden y Estado no son obligatorios: si el Excel no tiene esa columna (o está vacía), su filtro no se muestra.
  $('#campo-tipo').hidden = !sePuedeFiltrar('tipoOrden', mapa, filas);
  $('#campo-estado').hidden = !sePuedeFiltrar('estado', mapa, filas);

  // Solo se rehacen los desplegables: las cajas de texto no se tocan (la persona podría estar escribiendo).
  for (const [selector, clave, campo] of DESPLEGABLES) {
    llenarSelect($(selector), valoresUnicos(filas, campo), clave);
  }

  const vistaCentro = document.querySelector('input[name="vista"][value="centro"]');
  vistaCentro.disabled = !('codigoCentro' in mapa) && !('descripcionCentro' in mapa);
  if (vistaCentro.disabled && app.estado.vista === 'centro') {
    app.estado.vista = 'orden';
    for (const r of document.querySelectorAll('input[name="vista"]')) r.checked = r.value === 'orden';
  }
}

/** Rehace las opciones de un desplegable ("Todos" + los valores del Excel) sin perder lo elegido. */
function llenarSelect(select, valores, clave) {
  const seleccionado = app.estado[clave];
  select.innerHTML =
    '<option value="">Todos</option>' +
    valores.map((v) => `<option value="${escaparHtml(v)}">${escaparHtml(v)}</option>`).join('');
  // Si el valor elegido existe con otras mayúsculas/tildes, se usa el del Excel.
  const igual = valores.find((v) => normalizarTexto(v) === normalizarTexto(seleccionado));
  ponerValorSelect(select, igual ?? seleccionado);
  if (igual !== undefined) app.estado[clave] = igual;
}

/** Texto de "Columnas detectadas": dónde está el Excel en SharePoint/OneDrive (para fijarlo en config.json). */
function htmlUbicacionExcel() {
  const a = app.archivo;
  if (!a?.driveId || !a?.itemId) return '';
  const origenes = {
    config: 'driveId + itemId de config.json',
    enlace: 'el enlace de config.json',
    busqueda: 'búsqueda en SharePoint con el enlace de config.json',
    memoria: 'búsqueda en SharePoint (guardada en esta pestaña)',
  };
  return (
    '<p class="ubicacion-excel">Ubicación del Excel en SharePoint/OneDrive' +
    (a.origen && origenes[a.origen] ? ` (encontrado con ${escaparHtml(origenes[a.origen])})` : '') +
    `: <br>driveId: <code>${escaparHtml(a.driveId)}</code><br>itemId: <code>${escaparHtml(a.itemId)}</code>` +
    '<br><small>Si el enlace deja de funcionar, se pueden copiar estos dos valores en "datos.driveId" y ' +
    '"datos.itemId" de config.json.</small></p>'
  );
}

function mostrarInfoColumnas() {
  const d = app.datos;
  const filas = d.columnas
    .map(
      (c) =>
        `<tr><td>${escaparHtml(c.letra)}</td><td>${escaparHtml(c.titulo)}</td><td>${
          c.campo ? escaparHtml(NOMBRES_CAMPOS[c.campo]) : '<span class="tenue">(se muestra tal cual)</span>'
        }</td></tr>`,
    )
    .join('');
  $('#info-columnas').innerHTML =
    `<p>Archivo: <strong>${escaparHtml(app.archivo?.nombre || '')}</strong> · Hoja: <strong>${escaparHtml(d.hoja)}</strong>` +
    ` · Fila de títulos: <strong>${escaparHtml(d.filaEncabezado ?? '–')}</strong>` +
    ` · Filas con datos: <strong>${d.filas.length.toLocaleString('es-PE')}</strong>` +
    (d.filasVacias ? ` · Filas vacías ignoradas: ${d.filasVacias}` : '') +
    (d.filasRellenadas
      ? ` · Filas sin centro que se completaron con el centro de la fila de arriba: ${d.filasRellenadas}`
      : '') +
    (d.celdasConError ? ` · Celdas con error de fórmula (#N/A, #DIV/0!…): ${d.celdasConError}` : '') +
    '</p>' +
    `<p>Columnas ocultas (no se muestran, no se buscan ni se exportan): <strong>${
      d.columnasOcultas?.length
        ? d.columnasOcultas.map((c) => `${escaparHtml(c.titulo)} (${escaparHtml(c.letra)})`).join(', ')
        : 'ninguna'
    }</strong></p>` +
    htmlUbicacionExcel() +
    '<div class="contenedor-mini"><table class="tabla tabla-mini"><thead><tr><th scope="col">Columna</th>' +
    '<th scope="col">Título en el Excel</th><th scope="col">La app la usa como</th></tr></thead>' +
    `<tbody>${filas}</tbody></table></div>`;
}

// ---------------------------------------------------------------------------
// Dibujar tabla, contador, paginación y URL
// ---------------------------------------------------------------------------

/** Recuerda qué botón tenía el foco para devolvérselo después de redibujar. */
function recordarFoco() {
  const a = document.activeElement;
  if (!(a instanceof HTMLElement)) return null;
  if (a.matches('.btn-orden')) return `.btn-orden[data-orden="${CSS.escape(a.dataset.orden)}"]`;
  if (a.matches('.btn-expandir')) return `.btn-expandir[data-grupo="${CSS.escape(a.dataset.grupo)}"]`;
  if (a.matches('.btn-pagina')) return `.btn-pagina[aria-label="${CSS.escape(a.getAttribute('aria-label'))}"]`;
  return null;
}

function restaurarFoco(selector) {
  if (!selector) return;
  const el = document.querySelector(selector);
  if (el && !el.disabled) {
    el.focus();
  } else if (selector.startsWith('.btn-pagina')) {
    // El botón quedó desactivado (ej. llegaste a la última página): el foco pasa al texto "Página X de Y".
    const actual = $('.pagina-actual');
    if (actual) {
      actual.tabIndex = -1;
      actual.focus();
    }
  }
}

function dibujar() {
  if (!app.datos) return;
  const e = app.estado;
  const { columnas, filas } = app.datos;
  const foco = recordarFoco();

  const filtradas = filtrarFilas(filas, e);
  const terminos = dividirTerminos(e.q);
  const porCampo = {
    codigoCentro: normalizarTexto(e.codigo),
    descripcionCentro: normalizarTexto(e.descripcion),
    ordenCompra: normalizarTexto(e.orden),
  };
  const terminosDe = (col) => (col.campo && porCampo[col.campo] ? [...terminos, porCampo[col.campo]] : terminos);

  let pag;
  if (e.vista === 'centro') {
    const grupos = ordenarGrupos(agruparPorCentro(filtradas), e.ordenarPor, e.direccion);
    pag = paginar(grupos, e.pagina, e.tamano);
    $('#contenedor-tabla').innerHTML = htmlTablaCentros({
      grupos: pag.items,
      columnas,
      terminos,
      terminosDe,
      expandidos: app.expandidos,
      ordenarPor: e.ordenarPor,
      direccion: e.direccion,
      hayDatos: filas.length > 0,
    });
    $('#contador').textContent = textoContador(pag, app.totalCentros, 'centro');
    app.vistaActual = { filas: grupos.flatMap((g) => g.filas), grupos };
  } else {
    const col = columnas.find((c) => c.clave === e.ordenarPor);
    const ordenadas = col ? ordenarFilas(filtradas, col.indice, e.direccion) : filtradas;
    pag = paginar(ordenadas, e.pagina, e.tamano);
    $('#contenedor-tabla').innerHTML = htmlTablaOrdenes({
      columnas,
      filas: pag.items,
      terminosDe,
      ordenarPor: e.ordenarPor,
      direccion: e.direccion,
      hayDatos: filas.length > 0,
    });
    $('#contador').textContent = textoContador(pag, filas.length, 'orden');
    app.vistaActual = { filas: ordenadas, grupos: null };
  }
  e.pagina = pag.pagina;
  $('#paginacion').innerHTML = htmlPaginacion(pag);
  $('#btn-exportar').disabled = app.vistaActual.filas.length === 0;

  const activos = contarFiltrosActivos(e);
  const contadorFiltros = $('#contador-filtros');
  contadorFiltros.textContent = String(activos);
  contadorFiltros.hidden = activos === 0;
  $('#btn-limpiar').disabled = activos === 0 && !e.q;

  restaurarFoco(foco);
  guardarEnUrl();
}

function guardarEnUrl() {
  const consulta = escribirEstadoEnUrl(app.estado, app.tamanoPorDefecto);
  const nueva = `${location.pathname}${consulta}${location.hash}`;
  if (nueva !== `${location.pathname}${location.search}${location.hash}`) {
    history.replaceState(history.state, '', nueva);
  }
}

async function exportar() {
  const { filas, grupos } = app.vistaActual;
  if (!filas.length) return;
  const { exportarExcel } = await import('./exportar.js');
  const nombre = exportarExcel(app.datos.columnas, filas, grupos);
  avisar(`Se descargó ${nombre} (${filas.length.toLocaleString('es-PE')} filas)`);
}

// ---------------------------------------------------------------------------
// Auto-actualización
// ---------------------------------------------------------------------------

function programarAutoActualizacion() {
  const minutos = Number(app.config.autoActualizarMinutos);
  if (!(minutos > 0)) return;
  const intervalo = Math.max(3000, minutos * 60 * 1000);
  setInterval(() => {
    if (document.visibilityState === 'visible') cargarDatos('auto');
  }, intervalo);
  // Si la pestaña estuvo escondida mucho tiempo, actualizar al volver.
  document.addEventListener('visibilitychange', () => {
    if (
      document.visibilityState === 'visible' &&
      app.ultimaConsulta &&
      Date.now() - app.ultimaConsulta.getTime() > intervalo
    ) {
      cargarDatos('auto');
    }
  });
}

arrancar();
