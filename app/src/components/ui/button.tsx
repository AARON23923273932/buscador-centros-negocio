import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Botón de shadcn/ui adaptado a la guía de estilo de AIC (src/estilos.css): solo colores de la paleta (sin
// transparencias ni transiciones de color, que mostrarían colores intermedios), foco visible solo con el teclado
// (foco-control / foco-primario) y desactivado sin opacidad.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent leading-tight font-medium whitespace-nowrap no-underline select-none disabled:pointer-events-none disabled:border-desactivado-borde disabled:bg-desactivado disabled:text-desactivado-texto aria-disabled:cursor-not-allowed aria-disabled:border-desactivado-borde aria-disabled:bg-desactivado aria-disabled:text-desactivado-texto [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "foco-primario border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover",
        outline:
          "foco-control border-input bg-card text-foreground hover:bg-accent hover:text-accent-foreground hover:not-focus-visible:border-primary",
        secondary: "foco-control bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "foco-control text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-enlace underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 gap-1 px-2.5 text-sm",
        lg: "h-11 gap-2.5 px-5 text-base",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
