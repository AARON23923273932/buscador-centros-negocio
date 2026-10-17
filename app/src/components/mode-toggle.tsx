import { Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

type Theme = ReturnType<typeof useTheme>["theme"]

const NEXT: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" }
const LABEL: Record<Theme, string> = { light: "claro", dark: "oscuro", system: "del sistema" }
const ICON = { light: Sun, dark: Moon, system: Monitor }

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const next = NEXT[theme]
  const Icon = ICON[theme]

  return (
    <Button
      type="button"
      id="btn-tema"
      variant="outline"
      size="icon"
      className="flex-none"
      onClick={() => setTheme(next)}
    >
      <Icon className="size-[18px]" aria-hidden="true" />
      <span className="sr-only">
        {`Tema ${LABEL[theme]}. Cambiar a tema ${LABEL[next]}`}
      </span>
    </Button>
  )
}
