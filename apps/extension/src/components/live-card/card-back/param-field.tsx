import type { SourceParamSchema } from "@newsnext/source-kit/types"
import { Button } from "@newsnext/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@newsnext/ui/components/select"
import { Switch } from "@newsnext/ui/components/switch"
import { cn } from "@/lib/utils"
import {
  EditableInput,
  Info,
  NumberInput,
  SelectLikeValue,
  Text,
} from "./fields"

export function ParamField({
  param,
  value,
  editable,
  onChange,
}: {
  param: SourceParamSchema
  value: unknown
  editable: boolean
  onChange: (value: unknown) => void
}) {
  const currentValue = value ?? param.default

  if (param.type === "switch") {
    return (
      <Info label={param.title}>
        <div className={cn("flex w-full items-center gap-3 pl-2", editable ? "justify-start pr-2" : "justify-end")}>
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
    const selectedOption = param.values.find(option => option.value === String(currentValue))

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
          variant="inline"
          value={String(currentValue)}
          onValueChange={nextValue => onChange(nextValue)}
        >
          <SelectTrigger onClick={e => e.stopPropagation()}>
            <span className="flex-1 truncate text-left text-sm">
              {selectedOption?.label ?? String(currentValue)}
            </span>
          </SelectTrigger>
          <SelectContent
            align="end"
            alignItemWithTrigger={false}
          >
            {param.values.map(option => (
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
    const selectedLabels = param.values.flatMap(option =>
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
          {param.values.map((option) => {
            const isSelected = selectedValues.includes(option.value)
            return (
              <Button
                key={option.value}
                type="button"
                size="xs"
                variant={isSelected ? "default" : "outline"}
                tone="theme"
                className="h-6"
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
