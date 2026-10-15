import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Toggle as TogglePrimitive } from "radix-ui"

// Botón de dos estados de shadcn/ui con los colores de la guía de AIC: el elegido va en el color principal
// (Primary Blue con texto blanco); sin transparencias; foco solo con el teclado (foco-control).
const toggleVariants = cva(
  "foco-control inline-flex items-center justify-center gap-1 rounded-md border border-transparent font-medium whitespace-nowrap hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:text-desactivado-texto data-[state=on]:bg-primary data-[state=on]:text-primary-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border-input bg-card",
      },
      size: {
        default: "h-9 min-w-9 px-3.5",
        sm: "h-8 min-w-8 px-2.5 text-sm",
        lg: "h-10 min-w-10 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
