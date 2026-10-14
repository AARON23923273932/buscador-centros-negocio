// Barra sobre la tabla: "Por orden / Por centro de negocio", el contador, filas por página y "Exportar a Excel".
import type { Vista } from '../logica/tipos.ts';
import { IconoDescargar } from './Iconos.tsx';

interface Props {
  vista: Vista;
  vistaCentroDisponible: boolean;
  contador: string;
  tamano: number;
  tamanos: readonly number[];
  exportarDesactivado: boolean;
  alCambiarVista: (vista: Vista) => void;
  alCambiarTamano: (tamano: number) => void;
  alExportar: () => void;
}

export function BarraResultados(props: Props) {
  const opcion = (valor: Vista, texto: string, desactivada = false) => (
    <label className="opcion-vista">
      <input
        type="radio"
        name="vista"
        value={valor}
        checked={props.vista === valor}
        disabled={desactivada}
        onChange={(ev) => {
          if (ev.target.checked) props.alCambiarVista(valor);
        }}
      />{' '}
      <span>{texto}</span>
    </label>
  );

  return (
    <div className="barra-resultados">
      <div className="selector-vista" role="radiogroup" aria-label="Forma de ver los resultados">
        {opcion('orden', 'Por orden')}
        {opcion('centro', 'Por centro de negocio', !props.vistaCentroDisponible)}
      </div>
      <p id="contador" className="contador" aria-live="polite">
        {props.contador}
      </p>
      <div className="acciones-resultados">
        <label htmlFor="tam-pagina" className="etiqueta-tamano">
          Filas por página
        </label>
        <select id="tam-pagina" value={String(props.tamano)} onChange={(ev) => props.alCambiarTamano(Number(ev.target.value))}>
          {props.tamanos.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button type="button" id="btn-exportar" className="btn btn-secundario" disabled={props.exportarDesactivado} onClick={props.alExportar}>
          <IconoDescargar />
          Exportar a Excel
        </button>
      </div>
    </div>
  );
}
