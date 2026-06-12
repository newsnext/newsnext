import type { Color } from "@newsnext/shared/types"
import type { PropsWithChildren } from "react"
import { COLORS } from "@newsnext/shared/constants"
import { Input } from "@newsnext/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@newsnext/ui/components/select"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

const editableFieldClassName = "h-6 w-full rounded-3xl border border-transparent bg-transparent px-2 text-sm leading-none text-right shadow-none transition-colors hover:bg-background/40 focus-visible:border-input/50 focus-visible:bg-background/60 focus-visible:ring-1 focus-visible:ring-ring/30"

export const editableSelectClassName = cn(
  editableFieldClassName,
  "py-0 data-[size=default]:h-6 data-[size=sm]:h-6 justify-end",
  "[&_[data-slot=select-value]]:justify-end [&_[data-slot=select-value]]:text-right",
)

export function EditableInput({ text, editable = false, onChange }: { text: string, editable?: boolean, onChange?: (value: string) => void }) {
  const [value, setValue] = useState(text)

  useEffect(() => {
    setValue(text)
  }, [text])

  if (!editable) {
    return <Text text={text} />
  }

  return (
    <Input
      className={editableFieldClassName}
      value={value}
      onChange={(e) => {
        setValue(e.target.value)
        onChange?.(e.target.value)
      }}
      onClick={e => e.stopPropagation()}
    />
  )
}

export function NumberInput({ num = 0, step = 1, editable, max = Infinity, min = -Infinity, onChange }: { num?: number, step?: number, editable?: boolean, max?: number, min?: number, onChange?: (value: number) => void }) {
  const [value, setValue] = useState(num)

  useEffect(() => {
    setValue(num)
  }, [num])

  const handleChange = (val: number) => {
    const newValue = Math.max(min, Math.min(max, val))
    setValue(newValue)
    onChange?.(newValue)
  }

  if (!editable) {
    return <Text text={num.toString()} />
  }

  return (
    <Input
      type="number"
      className={editableFieldClassName}
      value={value}
      onChange={e => handleChange(Number(e.target.value))}
      step={step}
      min={min}
      max={max}
      onClick={e => e.stopPropagation()}
    />
  )
}

export function Text({ text }: { text: string }) {
  const isLink = useMemo(() => text.startsWith("http"), [text])
  return (
    <span
      className={cn(
        "flex h-6 w-full items-center justify-end truncate rounded-3xl border border-transparent px-2 text-right font-normal leading-none",
        isLink && "cursor-pointer hover:underline",
      )}
      title={text}
      onClick={() => {
        if (isLink) {
          window.open(text, "_blank")
        }
      }}
    >
      {text}
    </span>
  )
}

export function SelectLikeValue({ children }: PropsWithChildren) {
  return (
    <span className="flex h-6 w-full items-center justify-end gap-1.5 rounded-3xl border border-transparent px-2 leading-none">
      <span className="flex min-w-0 items-center justify-end gap-2">
        {children}
      </span>
      <span className="size-4 shrink-0" aria-hidden />
    </span>
  )
}

export function ColorSwitch({ color, className }: { color: Color, className?: string }) {
  return (
    <span
      className={cn("inline-block rounded-full", className)}
      style={{ backgroundColor: `var(--color-${color}-500)` }}
    />
  )
}

export function Info(props: PropsWithChildren<{
  icon: React.ReactNode
  label: string
  className?: string
}>) {
  return (
    <div className={cn("flex min-h-6 w-full items-center justify-between gap-3 border-b border-border/10 pb-1 mb-1 last:mb-0 last:border-0", props.className)}>
      <span className="flex gap-2 items-center shrink-0 text-muted-foreground">
        {props.icon}
        <span className="font-medium text-sm leading-none">{props.label}</span>
      </span>
      <div className="flex-1 min-w-0 flex justify-end max-w-40">
        {props.children}
      </div>
    </div>
  )
}

export function ColorSelector({ color, editable, onChange }: { color: Color, editable?: boolean, onChange?: (color: Color) => void }) {
  if (!editable) {
    return (
      <SelectLikeValue>
        <ColorSwitch color={color} className="size-3" />
        <span className="text-sm">{color}</span>
      </SelectLikeValue>
    )
  }

  return (
    <Select value={color} onValueChange={val => onChange?.(val as Color)}>
      <SelectTrigger className={editableSelectClassName} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <ColorSwitch color={color} className="size-3" />
          <span className="text-sm">{color}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="w-42">
        <div className="grid grid-cols-6 place-items-center gap-1 p-1.5">
          {COLORS.map(c => (
            <SelectItem
              key={c}
              value={c}
              className="grid size-7 cursor-pointer place-items-center p-0"
              indicatorClassName="hidden!"
              title={c}
            >
              <ColorSwitch color={c} className="size-4" />
            </SelectItem>
          ))}
        </div>
      </SelectContent>
    </Select>
  )
}
