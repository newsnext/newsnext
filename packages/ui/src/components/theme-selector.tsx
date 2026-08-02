import type { Color } from "@newsnext/shared/types"
import { COLORS } from "@newsnext/shared/constants"
import { Logo } from "@newsnext/ui/components/logo"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import { m } from "motion/react"

export interface ThemeSelectorProps {
  value: Color
  onValueChange: (color: Color) => void
  layoutId?: string
}

export function ThemeSelector({ value, onValueChange, layoutId = "theme-indicator" }: ThemeSelectorProps): React.JSX.Element {
  return (
    <RadioGroup
      variant="palette"
      value={value}
      onValueChange={onValueChange}
      onClick={event => event.stopPropagation()}
    >
      {COLORS.map(color => (
        <RadioGroupItem
          key={color}
          value={color}
          className={color}
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
          <Logo className="size-full p-0.5" />
        </RadioGroupItem>
      ))}
    </RadioGroup>
  )
}
