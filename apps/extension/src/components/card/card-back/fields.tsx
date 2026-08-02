import type { PropsWithChildren } from "react"
import { Button } from "@newsnext/ui/components/button"
import { Input } from "@newsnext/ui/components/input"
import { useMemo } from "react"
import { cn } from "@/lib/utils"

export function EditableInput({ text, editable = false, onChange }: { text: string, editable?: boolean, onChange?: (value: string) => void }) {
  if (!editable) {
    return <Text text={text} />
  }

  return (
    <Input
      variant="inline"
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
    <Button
      type="button"
      variant="transparent"
      size="icon-xs"
      className={cn("ml-auto size-5 shrink-0 overflow-hidden bg-background/40 p-0", rounded ? "rounded-full" : "rounded-md")}
      title={src}
      onClick={() => window.open(src, "_blank")}
    >
      <img
        className="size-full object-cover"
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
      />
    </Button>
  )
}

interface NumberInputProps {
  num?: number
  editable?: boolean
  max?: number
  min?: number
  onChange?: (value: number) => void
}

export function NumberInput({
  num = 0,
  editable,
  max = Infinity,
  min = -Infinity,
  onChange,
}: NumberInputProps) {
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
      variant="inline"
      value={num}
      onChange={e => handleChange(Number(e.target.value))}
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
        isLink && "hover:underline",
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
