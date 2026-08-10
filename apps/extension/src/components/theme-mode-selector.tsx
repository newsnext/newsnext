import type { ThemeMode } from "@/lib/utils/swith-theme"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import { cn } from "@newsnext/ui/lib/utils"
import { PhMonitor, PhMoon, PhSun } from "./icons/ph"

const THEME_MODE_OPTIONS = [
  { Icon: PhMoon, label: "Dark", value: "dark" },
  { Icon: PhSun, label: "Light", value: "light" },
  { Icon: PhMonitor, label: "System", value: "system" },
] as const

interface ThemeModeSelectorProps {
  className?: string
  size?: "default" | "sm"
  value: ThemeMode
  onValueChange: (value: ThemeMode) => void
}

export function ThemeModeSelector({
  className,
  size = "default",
  value,
  onValueChange,
}: ThemeModeSelectorProps): React.JSX.Element {
  const itemClassName = size === "sm" ? "size-7 p-1.5" : "size-8 p-2"

  return (
    <RadioGroup
      aria-label="Theme mode"
      className={cn(size === "sm" && "h-8 p-0.5", className)}
      value={value}
      onValueChange={onValueChange}
      variant="segmented"
    >
      {THEME_MODE_OPTIONS.map(({ Icon, label, value: optionValue }) => (
        <RadioGroupItem
          key={optionValue}
          aria-label={label}
          className={itemClassName}
          title={label}
          value={optionValue}
        >
          <Icon aria-hidden className="size-4" />
        </RadioGroupItem>
      ))}
    </RadioGroup>
  )
}
