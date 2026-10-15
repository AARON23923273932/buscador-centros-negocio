import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Aviso de shadcn/ui con la "caja de nota" de la guía de AIC: fondo Light Blue, borde izquierdo grueso Primary
// Blue, demás bordes Border Gray y texto negro. La guía no permite colores fuera de la paleta (ni rojo ni
// amarillo): un error se distingue con su ícono, su borde más grueso y role="alert", no con el color.
const alertVariants = cva(
  "relative w-full rounded-md border border-l-4 border-border border-l-nota-borde bg-nota px-4 py-3 text-left text-nota-texto has-[>svg]:grid has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:items-start has-[>svg]:gap-x-2.5 [&>svg]:mt-0.5 [&>svg]:size-[18px] [&>svg]:text-nota-titulo [&_strong]:text-nota-titulo",
  {
    variants: {
      variant: {
        default: "",
        error: "border-l-8",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Alert }
