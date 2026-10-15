import * as React from "react"
import { cn } from "cn"
import { ChevronDownIcon } from "lucide-react"

// Desplegable NATIVO (<select>) de shadcn/ui con los colores de la guía de AIC. Se usa en vez del "Select" de
// Radix: el <select> del navegador es el más accesible (en el celular abre la lista del sistema, se elige
// escribiendo las primeras letras y los lectores de pantalla lo conocen) y funciona bien con listas largas
// (los clientes del Excel). La flecha es un ícono propio (igual en todos los navegadores).
type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default"
}

function NativeSelect({
  className,
  size = "default",
  ...props
}: NativeSelectProps) {
  return (
    <div
      className={cn("group/native-select relative w-fit", className)}
      data-slot="native-select-wrapper"
      data-size={size}
    >
      <select
        data-slot="native-select"
        data-size={size}
        className="foco-control h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-card py-1 pr-8 pl-2.5 text-foreground hover:not-focus-visible:not-disabled:border-primary disabled:cursor-not-allowed disabled:border-desactivado-borde disabled:bg-desactivado disabled:text-desactivado-texto data-[size=sm]:h-8"
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground select-none"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-card text-foreground", className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOption }
