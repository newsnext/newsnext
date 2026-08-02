import type { Color } from "@newsnext/shared/types"
import { COLORS } from "@newsnext/shared/constants"
import { m } from "motion/react"
import { cn } from "@/lib/utils"
import { Logo } from "../icons/logo"

interface ThemeSelectorProps {
  value: Color
  onValueChange: (color: Color) => void
  layoutId?: string
}

export function ThemeSelector({ value, onValueChange, layoutId = "theme-indicator" }: ThemeSelectorProps): React.JSX.Element {
  return (
    <div className="grid h-full w-full grid-cols-[repeat(6,2rem)] place-content-center gap-2">
      {COLORS.map(color => (
        <button
          key={color}
          type="button"
          className={cn(
            "text-theme-500 size-8 hover:scale-110 p-0 relative self-center justify-self-center",
            color,
          )}
          onClick={(e) => {
            e.stopPropagation()
            onValueChange(color)
          }}
          title={color}
          aria-label={`${color} theme`}
          aria-pressed={value === color}
        >
          {value === color && (
            <m.div
              layoutId={layoutId}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-theme-500"
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
              }}
            />
          )}
          <Logo className="size-full p-0.5" />
        </button>
      ))}
    </div>
  )
}
