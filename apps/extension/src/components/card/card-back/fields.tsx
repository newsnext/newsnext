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
import { useMemo } from "react"
import { cn } from "@/lib/utils"

const editableFieldClassName = "h-6 w-full rounded-3xl border border-transparent bg-transparent px-2 text-sm leading-none text-left shadow-none transition-colors hover:bg-background/40 focus-visible:border-input/50 focus-visible:bg-background/60 focus-visible:ring-1 focus-visible:ring-ring/30"

export const editableSelectClassName = cn(
  editableFieldClassName,
  "justify-between py-0 text-left data-[size=default]:h-6 data-[size=sm]:h-6",
  "[&_[data-slot=select-value]]:justify-start [&_[data-slot=select-value]]:text-left",
)

export const editableSelectItemClassName = "h-6 py-0 pl-1"

export const editableSelectContentClassName = "min-w-(--anchor-width) rounded-xl border-0 bg-background/80 p-1 shadow-lg shadow-black/10 backdrop-blur-xl ring-1 ring-border/60 [&_[data-slot=select-item]]:rounded-lg [&_[data-slot=select-item]]:focus:bg-foreground/5"

export function EditableInput({ text, editable = false, onChange }: { text: string, editable?: boolean, onChange?: (value: string) => void }) {
  if (!editable) {
    return <Text text={text} />
  }

  return (
    <Input
      className={editableFieldClassName}
      value={text}
      onChange={(e) => {
        onChange?.(e.target.value)
      }}
      onClick={e => e.stopPropagation()}
    />
  )
}

export function EditableImage({
  src,
  alt,
  rounded = false,
  editable = false,
  onChange,
}: {
  src: string
  alt: string
  rounded?: boolean
  editable?: boolean
  onChange?: (value: string) => void
}) {
  if (editable) {
    return <EditableInput text={src} editable onChange={onChange} />
  }

  if (!src) {
    return <Text text="" />
  }

  return (
    <button
      type="button"
      className={cn("ml-auto size-5 shrink-0 overflow-hidden bg-background/40", rounded ? "rounded-full" : "rounded-md")}
      title={src}
      onClick={() => window.open(src, "_blank")}
    >
      <img
        className="size-full object-cover"
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
      />
    </button>
  )
}

export function NumberInput({ num = 0, step = 1, editable, max = Infinity, min = -Infinity, onChange }: { num?: number, step?: number, editable?: boolean, max?: number, min?: number, onChange?: (value: number) => void }) {
  const handleChange = (val: number) => {
    const newValue = Math.max(min, Math.min(max, val))
    onChange?.(newValue)
  }

  if (!editable) {
    return <Text text={num.toString()} />
  }

  return (
    <Input
      type="number"
      className={editableFieldClassName}
      value={num}
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
        "flex h-6 w-full items-center justify-end rounded-3xl border border-transparent pl-2 font-normal leading-none",
        isLink && "cursor-pointer hover:underline",
      )}
      title={text}
      onClick={() => {
        if (isLink) {
          window.open(text, "_blank")
        }
      }}
    >
      <span className="block max-w-full truncate text-left">
        {text}
      </span>
    </span>
  )
}

export function SelectLikeValue({ children }: PropsWithChildren) {
  return (
    <span className="flex h-6 w-full items-center justify-end rounded-3xl border border-transparent pl-2 leading-none">
      <span className="flex min-w-0 max-w-full items-center gap-2 text-left">
        {children}
      </span>
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
  icon?: React.ReactNode
  label: string
  className?: string
}>) {
  return (
    <div className={cn("flex min-h-6 w-full items-center justify-between gap-3 mb-1 last:mb-0", props.className)}>
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
        <span title={color}>
          <ColorSwitch color={color} className="size-3" />
        </span>
      </SelectLikeValue>
    )
  }

  return (
    <Select value={color} onValueChange={val => onChange?.(val as Color)}>
      <SelectTrigger className={editableSelectClassName} onClick={e => e.stopPropagation()}>
        <div className="flex flex-1 items-center justify-start" title={color}>
          <ColorSwitch color={color} className="size-3" />
        </div>
      </SelectTrigger>
      <SelectContent
        align="end"
        alignItemWithTrigger={false}
        className={cn("w-42", editableSelectContentClassName)}
      >
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

export function ValueSelector<T extends string>({
  value,
  options,
  editable,
  onChange,
}: {
  value: T
  options: readonly { label: string, value: T }[]
  editable?: boolean
  onChange?: (value: T) => void
}) {
  const selectedOption = options.find(option => option.value === value)

  if (!editable) {
    return (
      <SelectLikeValue>
        <span className="truncate text-sm">
          {selectedOption?.label ?? value}
        </span>
      </SelectLikeValue>
    )
  }

  return (
    <Select value={value} onValueChange={nextValue => onChange?.(nextValue as T)}>
      <SelectTrigger className={editableSelectClassName} onClick={event => event.stopPropagation()}>
        <span className="flex-1 truncate text-left text-sm">
          {selectedOption?.label ?? value}
        </span>
      </SelectTrigger>
      <SelectContent
        align="end"
        alignItemWithTrigger={false}
        className={editableSelectContentClassName}
      >
        {options.map(option => (
          <SelectItem key={option.value} value={option.value} className={editableSelectItemClassName}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
