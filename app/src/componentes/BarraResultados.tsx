// Barra sobre la tabla: "Por orden / Por centro de negocio", el contador, filas por página y "Exportar a Excel".
//
// "Por orden / Por centro" es un ToggleGroup de shadcn/ui (Radix) de una sola opción: para los lectores de
// pantalla es un grupo de opciones (role="radiogroup", cada una role="radio" con aria-checked). Con el teclado:
// Tab llega a la opción elegida, las flechas pasan a la otra y Espacio o Enter la elige.
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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

const esVista = (valor: string): valor is Vista => valor === 'orden' || valor === 'centro';

export function BarraResultados(props: Props) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 max-escritorio:flex-col max-escritorio:items-stretch">
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        id="selector-vista"
        className="max-escritorio:w-full"
        aria-label="Forma de ver los resultados"
        value={props.vista}
        // Al pulsar la opción ya elegida, Radix la "desmarca" (valor ""): se ignora, siempre hay una vista.
        onValueChange={(valor) => {
          if (esVista(valor)) props.alCambiarVista(valor);
        }}
      >
        <ToggleGroupItem value="orden" className="max-escritorio:flex-1">
          Por orden
        </ToggleGroupItem>
        <ToggleGroupItem value="centro" className="max-escritorio:flex-1" disabled={!props.vistaCentroDisponible}>
          Por centro de negocio
        </ToggleGroupItem>
      </ToggleGroup>
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
