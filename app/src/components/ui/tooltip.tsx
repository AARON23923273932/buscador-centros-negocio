"use client"

import * as React from "react"
import { cn } from "cn"
import { Slot, Tooltip as TooltipPrimitive } from "radix-ui"

// Ayuda flotante de shadcn/ui (Radix): aparece al pasar el mouse Y al llegar con el teclado (un "title" no se
// ve con el teclado ni en el celular), se cierra con Escape y la leen los lectores de pantalla.
// Un solo TooltipProvider para toda la app (en App.tsx, como recomienda shadcn/ui): cada Tooltip ya no trae el
// suyo, que con muchas ayudas (ej. una por fila) hacía más lento dibujar la tabla.
// Guía de AIC: aparece y desaparece SIN fundido (el fundido de shadcn/ui, fade-in/fade-out, mostraba por unos
// 200 ms colores intermedios que no son de la paleta); solo se desliza y se agranda un poco al aparecer.
function TooltipProvider({
  delayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

/** Le pasa las props a su hijo (como asChild), menos aria-describedby. */
function SinDescripcion({
  "aria-describedby": _descripcion,
  ...props
}: React.ComponentProps<typeof Slot.Root>) {
  return <Slot.Root {...props} />
}

/**
 * Radix describe al botón con la ayuda flotante (aria-describedby). Si la ayuda solo repite el nombre del botón
 * (ej. ☀️/🌙: nombre y ayuda "Cambiar a modo oscuro"), el lector de pantalla lo diría dos veces: con
 * sinDescripcion (agregado para la app; siempre con asChild) el botón queda sin esa descripción.
 */
function TooltipTrigger({
  sinDescripcion = false,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger> & {
  sinDescripcion?: boolean
}) {
  if (sinDescripcion) {
    return (
      <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} asChild>
        <SinDescripcion>{children}</SinDescripcion>
      </TooltipPrimitive.Trigger>
    )
  }
  return (
    <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props}>
      {children}
    </TooltipPrimitive.Trigger>
  )
}

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-card data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:animate-in data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:zoom-in-95",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
