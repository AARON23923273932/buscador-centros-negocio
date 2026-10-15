// Panel de filtros: desplegables (Cliente, Tipo de orden, Estado: NativeSelect de shadcn/ui) y cajas "contiene"
// (Código, Descripción, Orden: Input de shadcn/ui). En el celular el panel se abre con el botón "Filtros"
// (muestra cuántos hay activos).
import { useState } from 'react';
import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { Borradores, ClaveTexto } from '../hooks/useBusqueda.ts';
import type { EstadoBusqueda } from '../logica/tipos.ts';
import type { ClaveControl, ClaveDesplegable, EstadoControl } from '../logica/vista.ts';
import { IconoFiltros } from './Iconos.tsx';

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

/** Caja de un filtro (etiqueta + control). */
const CAMPO = 'flex min-w-0 flex-col gap-1';
const ETIQUETA = 'text-sm font-semibold text-muted-foreground';

export function Filtros(props: Props) {
  const { estado, controles, opciones, activos } = props;
  const [abierto, setAbierto] = useState(false);

  /** Desplegable: "Todos" + los valores del Excel (+ el elegido, si no está en la lista: ej. vino en un enlace). */
  const desplegable = (clave: ClaveDesplegable, id: string) => {
    const valor = estado[clave];
    const lista = valor && !opciones[clave].includes(valor) ? [...opciones[clave], valor] : opciones[clave];
    return (
      <NativeSelect
        id={id}
        className="w-full"
        value={valor}
        disabled={!controles[clave].disponible}
        title={controles[clave].motivo || undefined}
        onChange={(ev) => props.alElegir(clave, ev.target.value)}
      >
        <NativeSelectOption value="">Todos</NativeSelectOption>
        {lista.map((v) => (
          <NativeSelectOption key={v} value={v}>
            {v}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    );
  };

  /** Caja de texto "contiene": filtra 200 ms después de la última tecla (Enter = ya). */
  const texto = (clave: ClaveTexto & ClaveControl, id: string) => (
    <Input
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
      <Button
        type="button"
        id="btn-mostrar-filtros"
        variant="outline"
        className="mb-3 escritorio:hidden print:hidden"
        aria-expanded={abierto}
        aria-controls="panel-filtros"
        onClick={() => setAbierto((a) => !a)}
      >
        <IconoFiltros />
        Filtros{' '}
        <Badge id="contador-filtros" hidden={!activos}>
          {activos ?? ''}
        </Badge>
      </Button>

      <fieldset
        id="panel-filtros"
        className={cn(
          'mb-3 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-end gap-3 rounded-lg border border-border bg-card px-3.5 pt-3 pb-3.5 max-escritorio:grid-cols-1 print:hidden',
          abierto ? 'abierto' : 'max-escritorio:hidden',
        )}
      >
        <legend className="px-1.5 text-sm font-semibold">Filtros</legend>
        <div className={CAMPO}>
          <label htmlFor="f-cliente" className={ETIQUETA}>
            Cliente
          </label>
          {desplegable('cliente', 'f-cliente')}
        </div>
        <div className={CAMPO}>
          <label htmlFor="f-codigo" className={ETIQUETA}>
            Código
          </label>
          {texto('codigo', 'f-codigo')}
        </div>
        <div className={CAMPO}>
          <label htmlFor="f-descripcion" className={ETIQUETA}>
            Descripción
          </label>
          {texto('descripcion', 'f-descripcion')}
        </div>
        <div className={CAMPO}>
          <label htmlFor="f-orden" className={ETIQUETA}>
            Orden de compra / servicio
          </label>
          {texto('orden', 'f-orden')}
        </div>
        <div className={CAMPO} id="campo-tipo" hidden={!props.mostrarTipo}>
          <label htmlFor="f-tipo" className={ETIQUETA}>
            Tipo de orden
          </label>
          {desplegable('tipo', 'f-tipo')}
        </div>
        <div className={CAMPO} id="campo-estado" hidden={!props.mostrarEstado}>
          <label htmlFor="f-estado" className={ETIQUETA}>
            Estado
          </label>
          {desplegable('estado', 'f-estado')}
        </div>
        <div className={CAMPO}>
          <Button type="button" id="btn-limpiar" variant="outline" className="w-full" disabled={props.limpiarDesactivado} onClick={props.alLimpiar}>
            Limpiar filtros
          </Button>
        </div>
      </fieldset>
    </>
  );
}
