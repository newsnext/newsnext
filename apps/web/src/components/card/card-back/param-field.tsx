import type { Color } from "@newsnext/shared/types"
import type { SourceParamSchema } from "@newsnext/sources/typings"
import { Button } from "@newsnext/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@newsnext/ui/components/select"
import { Switch } from "@newsnext/ui/components/switch"
import { cn } from "@/lib/utils"
import { EditableInput, editableSelectClassName, Info, NumberInput, SelectLikeValue, Text } from "./fields"

export function ParamField({
  param,
  value,
  editable,
  color,
  onChange,
}: {
  param: SourceParamSchema
  value: unknown
  editable: boolean
  color: Color
  onChange: (value: unknown) => void
}) {
  const currentValue = value ?? param.default

  if (param.type === "switch") {
    return (
      <Info label={param.title}>
        <div className="flex items-center justify-end gap-3 px-2">
          <span className="text-xs text-muted-foreground">
            {currentValue ? "On" : "Off"}
          </span>
          <Switch
            checked={Boolean(currentValue)}
            disabled={!editable}
            onCheckedChange={checked => onChange(checked)}
            size="sm"
            className="data-disabled:opacity-100"
          />
        </div>
      </Info>
    )
  }

  if (param.type === "select") {
    const selectedOption = param.options.find(option => option.value === String(currentValue))

    if (!editable) {
      return (
        <Info label={param.title}>
          <SelectLikeValue>
            <span className="truncate text-sm">
              {selectedOption?.label ?? String(currentValue)}
            </span>
          </SelectLikeValue>
        </Info>
      )
    }

    return (
      <Info label={param.title}>
        <Select
          value={String(currentValue)}
          onValueChange={nextValue => onChange(nextValue)}
        >
          <SelectTrigger className={editableSelectClassName} onClick={e => e.stopPropagation()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {param.options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Info>
    )
  }

  if (param.type === "multiselect") {
    const selectedValues = Array.isArray(currentValue) ? currentValue.map(String) : []
    const selectedLabels = param.options.flatMap(option =>
      selectedValues.includes(option.value) ? [option.label] : [],
    )

    if (!editable) {
      return (
        <Info label={param.title}>
          <Text text={selectedLabels.length > 0 ? selectedLabels.join(", ") : "None"} />
        </Info>
      )
    }

    return (
      <Info label={param.title}>
        <div className="flex flex-wrap justify-end gap-1">
          {param.options.map((option) => {
            const isSelected = selectedValues.includes(option.value)
            return (
              <Button
                key={option.value}
                type="button"
                size="xs"
                variant={isSelected ? "default" : "outline"}
                className={cn("h-6", !isSelected && `text-${color}-600 border-${color}-200 bg-${color}-500/10`)}
                onClick={(event) => {
                  event.stopPropagation()
                  const nextValues = isSelected
                    ? selectedValues.filter(item => item !== option.value)
                    : [...selectedValues, option.value]
                  onChange(nextValues)
                }}
              >
                {option.label}
              </Button>
            )
          })}
        </div>
      </Info>
    )
  }

  if (param.type === "number") {
    return (
      <Info label={param.title}>
        <NumberInput
          num={typeof currentValue === "number" ? currentValue : Number(currentValue ?? param.default)}
          editable={editable}
          min={param.min}
          max={param.max}
          step={param.step}
          onChange={nextValue => onChange(nextValue)}
        />
      </Info>
    )
  }

  return (
    <Info label={param.title}>
      <EditableInput
        text={String(currentValue ?? "")}
        editable={editable}
        onChange={nextValue => onChange(nextValue)}
      />
    </Info>
  )
}
