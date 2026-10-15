import * as React from "react"
import { cn } from "cn"

// Tarjeta de shadcn/ui con la guía de AIC: fondo White (Black en modo oscuro) y borde Border Gray, sin sombra
// (una sombra mezclaría colores que no están en la paleta).
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("rounded-lg border border-border bg-card p-6 text-card-foreground", className)}
      {...props}
    />
  )
}

export { Card }
