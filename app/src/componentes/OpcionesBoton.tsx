// Grupo de opciones con forma de botones pegados (ej. "Por orden / Por centro de negocio"), armado SOLO con
// componentes de shadcn/ui sin cambios + props públicas de Radix:
//   - RadioGroup (shadcn/ui, Radix): el grupo es role="radiogroup" y cada opción role="radio" con aria-checked.
//     Se usa con el teclado como los <input type="radio"> del navegador (patrón de WAI-ARIA): Tab entra por la
//     opción elegida y las FLECHAS mueven el foco Y eligen esa opción (Espacio también elige); las opciones
//     desactivadas se saltan.
//   - ButtonGroup (shadcn/ui): los botones pegados. Su role="group" se cambia por role="presentation" (prop
//     pública): las opciones quedan directamente dentro del radiogroup para los lectores de pantalla.
//   - Button (shadcn/ui): el aspecto de cada opción. La elegida va con el estilo principal (variant="default") y
//     las demás con variant="outline". La opción de Radix (RadioGroupPrimitive.Item con asChild) le pasa al botón
//     sus roles, su estado y el manejo del teclado.
// Antes había un "RadioGroupBoton" agregado dentro de src/components/ui/radio-group.tsx; desde el 15/10/2026 los
// componentes de shadcn/ui no se editan (pedido de Gustavo).
import type { ComponentProps, ReactNode } from 'react';
import { cn } from 'cn';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { RadioGroup } from '@/components/ui/radio-group';

/** El grupo (radiogroup). className: solo medidas (ej. ancho). */
export function GrupoOpciones({ className, children, ...props }: ComponentProps<typeof RadioGroup>) {
  return (
    <RadioGroup className={cn('w-fit', className)} {...props}>
      <ButtonGroup role="presentation" className="w-full">
        {children}
      </ButtonGroup>
    </RadioGroup>
  );
}

interface PropsOpcion {
  value: string;
  /** true = es la opción elegida (estilo principal). */
  elegida: boolean;
  disabled?: boolean;
  /** Solo medidas (ej. "flex-1" en el celular). */
  className?: string;
  children: ReactNode;
}

/** Una opción del grupo, con el aspecto de un Button de shadcn/ui. */
export function OpcionBoton({ value, elegida, disabled, className, children }: PropsOpcion) {
  return (
    <RadioGroupPrimitive.Item value={value} disabled={disabled} asChild>
      <Button type="button" variant={elegida ? 'default' : 'outline'} className={className}>
        {children}
      </Button>
    </RadioGroupPrimitive.Item>
  );
}
