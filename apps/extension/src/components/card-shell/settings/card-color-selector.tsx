import type { Color } from "@newsnext/shared/types"
import { COLORS } from "@newsnext/shared/constants"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@newsnext/ui/components/select"
import { cn } from "@newsnext/ui/lib/utils"
import { useI18n } from "@/hooks/use-i18n"
import { SelectLikeValue } from "./fields"

interface CardColorSelectorProps {
  value: Color
  editable: boolean
  onValueChange: (color: Color) => void
}

function ColorSwatch({ color, className }: { color: Color, className?: string }): React.JSX.Element {
  return (
    <span
      aria-hidden
      className={cn("size-3 shrink-0 rounded-full", className)}
      style={{ backgroundColor: `var(--color-${color}-500)` }}
    />
  )
}

export function CardColorSelector({ value, editable, onValueChange }: CardColorSelectorProps): React.JSX.Element {
  const { t } = useI18n()

  if (!editable) {
    return (
      <SelectLikeValue>
        <span title={value} className="flex items-center">
          <ColorSwatch color={value} />
          <span className="sr-only">{value}</span>
        </span>
      </SelectLikeValue>
    )
  }

  return (
    <Select<Color>
      variant="inline"
      value={value}
      onValueChange={(color) => {
        if (color !== null) onValueChange(color)
      }}
    >
      <SelectTrigger aria-label={`${t("themeColor")}: ${value}`} title={value} onClick={event => event.stopPropagation()}>
        <ColorSwatch color={value} />
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false} className="w-52" onClick={event => event.stopPropagation()}>
        <div className="grid grid-cols-6 place-items-center gap-1 p-1">
          {COLORS.map(color => (
            <SelectItem
              key={color}
              value={color}
              label={color}
              title={color}
              showIndicator={false}
              className={cn(
                "size-7 rounded-full p-0",
                "focus:bg-transparent data-highlighted:bg-foreground/10 data-highlighted:focus:bg-foreground/10",
                "[&>[data-slot=select-item-text]]:items-center [&>[data-slot=select-item-text]]:justify-center",
              )}
            >
              <ColorSwatch
                color={color}
                className={cn("size-4", value === color && "ring-2 ring-foreground/60 ring-offset-2 ring-offset-background")}
              />
              <span className="sr-only">{color}</span>
            </SelectItem>
          ))}
        </div>
      </SelectContent>
    </Select>
  )
}
