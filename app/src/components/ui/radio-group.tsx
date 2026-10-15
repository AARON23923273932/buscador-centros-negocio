import * as React from "react"
import { cn } from "cn"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

// Grupo de opciones de shadcn/ui (Radix RadioGroup), con los colores de la guía de AIC (sin transparencias ni
// opacidad al desactivar; foco visible solo con el teclado: foco-control). Sigue el patrón de grupo de opciones de
// WAI-ARIA, igual que los <input type="radio"> del navegador: el grupo es role="radiogroup" y cada opción
// role="radio" con aria-checked; Tab entra por la opción elegida y las FLECHAS mueven el foco y eligen esa
// opción (Espacio también elige); las opciones desactivadas se saltan.
function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid w-full gap-3", className)}
      {...props}
    />
  )
}

/** Opción con forma de círculo (la de shadcn/ui); su texto va en un <label htmlFor> aparte. */
function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "foco-control peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input bg-card after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:border-desactivado-borde disabled:bg-desactivado data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-4 items-center justify-center"
      >
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

/**
 * Opción con forma de botón, para un grupo "segmentado" (botones pegados, ej. "Por orden / Por centro de negocio").
 * Agregada para la app (no viene en shadcn/ui): es la misma opción de Radix que RadioGroupItem —mismos roles y el
 * mismo manejo con el teclado—, con el texto adentro y el aspecto de un botón. La elegida va en el color principal
 * (Primary Blue con texto blanco; en oscuro, Light Blue con texto Primary Blue). El grupo va con className="flex".
 */
function RadioGroupBoton({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-boton"
      className={cn(
        "foco-control inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded-none border border-l-0 border-input bg-card px-3.5 font-medium whitespace-nowrap first:rounded-l-md first:border-l last:rounded-r-md hover:bg-accent hover:text-accent-foreground focus-visible:z-10 disabled:pointer-events-none disabled:text-desactivado-texto data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

export { RadioGroup, RadioGroupItem, RadioGroupBoton }
