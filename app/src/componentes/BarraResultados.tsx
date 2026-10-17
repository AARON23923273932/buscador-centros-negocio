import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { Vista } from '../logica/tipos.ts';
import { IconoDescargar } from './Iconos.tsx';
import { GrupoOpciones, OpcionBoton } from './OpcionesBoton.tsx';

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

const esVista = (valor: string): valor is Vista => valor === 'orden' || valor === 'centro';

export function BarraResultados(props: Props) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 max-escritorio:flex-col max-escritorio:items-stretch">
      <GrupoOpciones
        id="selector-vista"
        className="max-escritorio:w-full"
        aria-label="Forma de ver los resultados"
        value={props.vista}
        onValueChange={(valor) => {
          if (esVista(valor)) props.alCambiarVista(valor);
        }}
      >
        <OpcionBoton value="orden" elegida={props.vista === 'orden'} className="max-escritorio:flex-1">
          Por orden
        </OpcionBoton>
        <OpcionBoton value="centro" elegida={props.vista === 'centro'} className="max-escritorio:flex-1" disabled={!props.vistaCentroDisponible}>
          Por centro de negocio
        </OpcionBoton>
      </GrupoOpciones>
      <p id="contador" className="m-0 flex-[1_1_260px] text-sm text-muted-foreground max-escritorio:flex-none" aria-live="polite">
        {props.contador}
      </p>
      <div className="flex flex-wrap items-center gap-2 max-escritorio:justify-between print:hidden">
        <label htmlFor="tam-pagina" className="text-sm text-muted-foreground">
          Filas por página
        </label>
        <NativeSelect id="tam-pagina" value={String(props.tamano)} onChange={(ev) => props.alCambiarTamano(Number(ev.target.value))}>
          {props.tamanos.map((n) => (
            <NativeSelectOption key={n} value={n}>
              {n}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="button" id="btn-exportar" variant="outline" disabled={props.exportarDesactivado} onClick={props.alExportar}>
          <IconoDescargar />
          Exportar a Excel
        </Button>
      </div>
    </div>
  );
}
