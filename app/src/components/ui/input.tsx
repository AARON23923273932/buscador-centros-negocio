import * as React from "react"
import { cn } from "cn"

// Caja de texto de shadcn/ui con los colores de la guía de AIC: borde Gray (contraste 5,7:1), foco solo con
// el teclado (foco-control) y desactivada sin opacidad. Sin "pointer-events-none" al estar desactivada: así se
// ve su "title" (explica por qué no se puede usar).
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "foco-control h-9 w-full min-w-0 rounded-md border border-input bg-card px-2.5 py-1 text-foreground placeholder:text-muted-foreground hover:not-focus-visible:not-disabled:border-primary disabled:cursor-not-allowed disabled:border-desactivado-borde disabled:bg-desactivado disabled:text-desactivado-texto",
        className
      )}
      {...props}
    />
  )
}

export { Input }
