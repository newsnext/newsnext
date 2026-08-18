/* eslint-disable react-refresh/only-export-components */
import type { Color } from "@newsnext/shared/types"
import { ThemeSelector } from "@newsnext/ui/components/theme-selector"
import { useState } from "react"

function ThemeSelectorFixture(): React.JSX.Element {
  const [color, setColor] = useState<Color>("orange")

  return (
    <main className="mx-auto grid min-h-full w-full max-w-2xl content-start gap-8 p-8">
      <header className="grid gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Patterns</p>
        <h1 className="text-xl font-semibold">Theme selector</h1>
        <p className="text-sm text-muted-foreground">The NewsNext palette control for choosing a Board or Provider theme.</p>
      </header>
      <div className="h-28 w-full max-w-sm">
        <ThemeSelector value={color} onValueChange={setColor} layoutId="cosmos-theme" />
      </div>
      <p className="text-sm text-muted-foreground">
        Selected:
        {" "}
        {color}
      </p>
    </main>
  )
}

export default {
  "Theme selector": ThemeSelectorFixture,
}
