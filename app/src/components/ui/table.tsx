import * as React from "react"
import { cn } from "cn"

// Tabla de shadcn/ui con el formato de tablas de la guía de AIC (colores en src/estilos.css):
//  - encabezado: fondo Primary Blue, texto blanco en negrita y centrado, bordes Dark Blue; se queda fijo arriba
//    al bajar (sticky) dentro de la caja con scroll de la tabla;
//  - celdas: bordes Border Gray; filas alternas Light Gray (tabla de datos); al pasar el mouse, Light Blue (en
//    modo oscuro, Black con una raya izquierda Light Blue: --fila-hover y --fila-hover-marca);
//  - padding de la guía: encabezado 6 pt arriba/abajo y 4 pt a los lados (8 px / 5 px); datos 4 pt arriba/abajo
//    y 6 pt a los lados (5 px / 8 px).
// container={false}: sin la caja con scroll horizontal de shadcn (la app pone su propia caja con scroll: si
// hubiera dos, el encabezado fijo no se quedaría arriba).
function Table({
  className,
  container = true,
  ...props
}: React.ComponentProps<"table"> & { container?: boolean }) {
  const tabla = (
    <table
      data-slot="table"
      className={cn("w-full border-separate border-spacing-0 text-[15px] max-escritorio:text-sm", className)}
      {...props}
    />
  )
  if (!container) return tabla
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      {tabla}
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={className} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "bg-card even:bg-cebra hover:bg-fila-hover hover:[&>td:first-child]:shadow-[inset_4px_0_0_var(--fila-hover-marca)]",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "sticky top-0 z-[2] border-r border-b border-encabezado-borde bg-encabezado px-[5px] py-2 text-center align-middle font-bold whitespace-nowrap text-encabezado-texto last:border-r-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "border-r border-b border-border px-2 py-[5px] text-left align-top whitespace-nowrap last:border-r-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption }
