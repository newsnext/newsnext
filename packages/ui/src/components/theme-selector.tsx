import type { Color } from "@newsnext/shared/types"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import { COLORS } from "@newsnext/shared/constants"
import { ThemeIcon } from "@newsnext/ui/components/theme-icon"
import { cn } from "@newsnext/ui/lib/utils"
import { m } from "motion/react"

const themeOptionClassName = "text-theme-500 relative size-8 cursor-pointer self-center justify-self-center outline-none transition-transform hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"

export interface ThemeSelectorProps {
  value: Color
  onValueChange: (color: Color) => void
  layoutId?: string
}

export function ThemeSelector({ value, onValueChange, layoutId = "theme-indicator" }: ThemeSelectorProps): React.JSX.Element {
  return (
    <RadioGroup
      data-slot="theme-selector"
      aria-label="Theme color"
      className="grid h-full w-full grid-cols-[repeat(6,2rem)] place-content-center gap-2"
      value={value}
      onValueChange={onValueChange}
      onClick={event => event.stopPropagation()}
    >
      {COLORS.map(color => (
        <Radio.Root
          key={color}
          data-slot="theme-selector-item"
          value={color}
          className={cn(themeOptionClassName, color)}
          title={color}
          aria-label={`${color} theme`}
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
          <ThemeIcon
            className="size-full p-0.5"
            color={color}
          />
        </Radio.Root>
      ))}
    </RadioGroup>
  )
}
