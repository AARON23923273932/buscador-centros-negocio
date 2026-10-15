// Barra sobre la tabla: "Por orden / Por centro de negocio", el contador, filas por página y "Exportar a Excel".
//
// "Por orden / Por centro" es un RadioGroup de shadcn/ui (Radix) con forma de botones pegados: para los lectores
// de pantalla es un grupo de opciones (role="radiogroup", cada una role="radio" con aria-checked) y se usa con el
// teclado igual que los botones de opción del navegador: Tab llega a la opción elegida y las flechas pasan a la
// otra Y la eligen (cambia la vista al instante); Espacio también elige. Si "Por centro" está desactivado (el
// Excel no tiene columna de centro), las flechas lo saltan.
import { Button } from '@/components/ui/button';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { RadioGroup, RadioGroupBoton } from '@/components/ui/radio-group';
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
      <RadioGroup
        id="selector-vista"
        className="flex w-fit gap-0 max-escritorio:w-full"
        aria-label="Forma de ver los resultados"
        value={props.vista}
        onValueChange={(valor) => {
          if (esVista(valor)) props.alCambiarVista(valor);
        }}
      >
        <RadioGroupBoton value="orden" className="max-escritorio:flex-1">
          Por orden
        </RadioGroupBoton>
        <RadioGroupBoton value="centro" className="max-escritorio:flex-1" disabled={!props.vistaCentroDisponible}>
          Por centro de negocio
        </RadioGroupBoton>
      </RadioGroup>
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
