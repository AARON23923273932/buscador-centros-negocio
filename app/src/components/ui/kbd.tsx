import * as React from "react"
import { cn } from "cn"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center rounded-sm border border-border bg-card px-1 font-sans text-xs font-bold text-foreground select-none",
        className
      )}
      {...props}
    />
  )
}

export { Kbd }
