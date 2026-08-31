import type { ThemeMode } from "@/lib/utils/swith-theme"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import { cn } from "@newsnext/ui/lib/utils"
import { useI18n } from "@/hooks/use-i18n"
import { PhMonitor, PhMoon, PhSun } from "./icons/ph"

const THEME_MODE_OPTIONS = [
  { Icon: PhMoon, labelKey: "dark", value: "dark" },
  { Icon: PhSun, labelKey: "light", value: "light" },
  { Icon: PhMonitor, labelKey: "system", value: "system" },
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
  const { t } = useI18n()
  const itemClassName = size === "sm" ? "size-7 p-1.5" : "size-8 p-2"

  return (
    <RadioGroup
      aria-label={t("themeMode")}
      className={cn(size === "sm" && "h-8 p-0.5", className)}
      value={value}
      onValueChange={onValueChange}
      variant="segmented"
    >
      {THEME_MODE_OPTIONS.map(({ Icon, labelKey, value: optionValue }) => (
        <RadioGroupItem
          key={optionValue}
          aria-label={t(labelKey)}
          className={itemClassName}
          title={t(labelKey)}
          value={optionValue}
        >
          <Icon aria-hidden className="size-4" />
        </RadioGroupItem>
      ))}
    </RadioGroup>
  )
}
