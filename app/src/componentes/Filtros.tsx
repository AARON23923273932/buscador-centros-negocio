// Panel de filtros: desplegables (Cliente, Tipo de orden, Estado) y cajas "contiene" (Código,
// Descripción, Orden). En el celular el panel se abre con el botón "Filtros" (muestra cuántos hay activos).
import { useState } from 'react';
import type { Borradores, ClaveTexto } from '../hooks/useBusqueda.ts';
import type { EstadoBusqueda } from '../logica/tipos.ts';
import type { ClaveControl, ClaveDesplegable, EstadoControl } from '../logica/vista.ts';

interface Props {
  estado: EstadoBusqueda;
  borradores: Borradores;
  controles: Record<ClaveControl, EstadoControl>;
  /** Opciones de cada desplegable (valores del Excel, sin "Todos"). */
  opciones: Record<ClaveDesplegable, string[]>;
  /** Tipo de orden y Estado no son obligatorios: si el Excel no los tiene (o están vacíos), no se muestran. */
  mostrarTipo: boolean;
  mostrarEstado: boolean;
  /** Cuántos filtros activos (null = todavía no se leyó el Excel). */
  activos: number | null;
  limpiarDesactivado: boolean;
  alEscribir: (clave: ClaveTexto, valor: string) => void;
  alAplicarYa: (clave: ClaveTexto) => void;
  alElegir: (clave: ClaveDesplegable, valor: string) => void;
  alLimpiar: () => void;
}

export function Filtros(props: Props) {
  const { estado, controles, opciones, activos } = props;
  const [abierto, setAbierto] = useState(false);

  /** Desplegable: "Todos" + los valores del Excel (+ el elegido, si no está en la lista: ej. vino en un enlace). */
  const desplegable = (clave: ClaveDesplegable, id: string) => {
    const valor = estado[clave];
    const lista = valor && !opciones[clave].includes(valor) ? [...opciones[clave], valor] : opciones[clave];
    return (
      <select
        id={id}
        value={valor}
        disabled={!controles[clave].disponible}
        title={controles[clave].motivo || undefined}
        onChange={(ev) => props.alElegir(clave, ev.target.value)}
      >
        <option value="">Todos</option>
        {lista.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  };

  /** Caja de texto "contiene": filtra 200 ms después de la última tecla (Enter = ya). */
  const texto = (clave: ClaveTexto & ClaveControl, id: string) => (
    <input
      id={id}
      type="text"
      autoComplete="off"
      placeholder="Contiene…"
      value={props.borradores[clave]}
      disabled={!controles[clave].disponible}
      title={controles[clave].motivo || undefined}
      onChange={(ev) => props.alEscribir(clave, ev.target.value)}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter') props.alAplicarYa(clave);
      }}
    />
  );

  return (
    <>
      <button
        type="button"
        id="btn-mostrar-filtros"
        className="btn btn-secundario solo-movil"
        aria-expanded={abierto}
        aria-controls="panel-filtros"
        onClick={() => setAbierto((a) => !a)}
      >
        Filtros{' '}
        <span id="contador-filtros" className="insignia" hidden={!activos}>
          {activos ?? ''}
        </span>
      </button>

      <fieldset id="panel-filtros" className={`filtros${abierto ? ' abierto' : ''}`}>
        <legend>Filtros</legend>
        <div className="campo">
          <label htmlFor="f-cliente">Cliente</label>
          {desplegable('cliente', 'f-cliente')}
        </div>
        <div className="campo">
          <label htmlFor="f-codigo">Código</label>
          {texto('codigo', 'f-codigo')}
        </div>
        <div className="campo">
          <label htmlFor="f-descripcion">Descripción</label>
          {texto('descripcion', 'f-descripcion')}
        </div>
        <div className="campo">
          <label htmlFor="f-orden">Orden de compra / servicio</label>
          {texto('orden', 'f-orden')}
        </div>
        <div className="campo" id="campo-tipo" hidden={!props.mostrarTipo}>
          <label htmlFor="f-tipo">Tipo de orden</label>
          {desplegable('tipo', 'f-tipo')}
        </div>
        <div className="campo" id="campo-estado" hidden={!props.mostrarEstado}>
          <label htmlFor="f-estado">Estado</label>
          {desplegable('estado', 'f-estado')}
        </div>
        <div className="campo campo-boton">
          <button type="button" id="btn-limpiar" className="btn btn-secundario" disabled={props.limpiarDesactivado} onClick={props.alLimpiar}>
            Limpiar filtros
          </button>
        </div>
      </fieldset>
    </>
  );
}
