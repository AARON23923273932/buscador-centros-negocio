// Ayuda flotante (Tooltip de shadcn/ui, sin cambios) con una opción propia de la app: "sinDescripcion".
//
// La ayuda flotante aparece al pasar el mouse Y al llegar con el teclado (un "title" no se ve con el teclado ni
// en el celular), se cierra con Escape y la leen los lectores de pantalla: Radix la pone como DESCRIPCIÓN del
// botón (aria-describedby). Si la ayuda solo repite el nombre del botón (ej. ☀️/🌙: nombre y ayuda "Cambiar a modo
// oscuro"), el lector de pantalla lo diría dos veces. Con sinDescripcion el botón queda sin esa descripción.
//
// Antes esto estaba agregado DENTRO de src/components/ui/tooltip.tsx; desde el 15/10/2026 los componentes de
// shadcn/ui no se editan (pedido de Gustavo), así que vive aquí y usa solo props públicas: TooltipTrigger con
// asChild le pasa sus props a SinDescripcion, que las pasa al botón menos aria-describedby.
// Un solo TooltipProvider para toda la app (en App.tsx, como recomienda shadcn/ui).
import type { ComponentProps, ReactNode } from 'react';
import { Slot } from 'radix-ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Le pasa las props a su hijo (como asChild), menos aria-describedby. */
function SinDescripcion({ 'aria-describedby': _descripcion, ...props }: ComponentProps<typeof Slot.Root>) {
  return <Slot.Root {...props} />;
}

interface Props {
  /** Texto de la ayuda. */
  texto: ReactNode;
  /** true = la ayuda repite el nombre del botón: no se usa como su descripción (no se lee dos veces). */
  sinDescripcion?: boolean;
  /** El botón (o enlace) que muestra la ayuda: recibe las props de TooltipTrigger (asChild). */
  children: ReactNode;
}

export function AyudaFlotante({ texto, sinDescripcion = false, children }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{sinDescripcion ? <SinDescripcion>{children}</SinDescripcion> : children}</TooltipTrigger>
      <TooltipContent>{texto}</TooltipContent>
    </Tooltip>
  );
}
