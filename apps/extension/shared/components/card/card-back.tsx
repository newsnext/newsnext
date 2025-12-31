import type { Color } from "@newsnext/shared/types"
import type { PropsWithChildren } from "react"
import { COLORS } from "@newsnext/shared/constants"
import { getFavicon } from "@newsnext/shared/utils"
import { Button } from "@newsnext/ui/components/button"
import { Input } from "@newsnext/ui/components/input"
import { ScrollArea } from "@newsnext/ui/components/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@newsnext/ui/components/select"
import { useEffect, useMemo, useState } from "react"
import {
  PhArrowCircleLeftDuotone,
  PhInfoDuotone,
  PhLinkDuotone,
  PhPencilCircleDuotone,
} from "@/components/icons/ph"
import { cn } from "@/lib/utils"
import { IconButton } from "../common/button"
import { useCard } from "./card-context"

function EditableInput({ text, editable = false, onChange }: { text: string, editable?: boolean, onChange?: (value: string) => void }) {
  const [value, setValue] = useState(text)

  useEffect(() => {
    setValue(text)
  }, [text])

  if (!editable) {
    return <Text text={text} />
  }

  return (
    <Input
      className="h-7 px-2 w-full bg-background/50 focus-visible:ring-1"
      value={value}
      onChange={(e) => {
        setValue(e.target.value)
        onChange?.(e.target.value)
      }}
      onClick={e => e.stopPropagation()}
    />
  )
}

function NumberInput({ num, step = 1, editable, max = Infinity, min = -Infinity, onChange }: { num: number, step?: number, editable?: boolean, max?: number, min?: number, onChange?: (value: number) => void }) {
  if (!editable) {
    return <Text text={num.toString()} />
  }

  const [value, setValue] = useState(num)

  useEffect(() => {
    setValue(num)
  }, [num])

  const handleChange = (val: number) => {
    const newValue = Math.max(min, Math.min(max, val))
    setValue(newValue)
    onChange?.(newValue)
  }

  return (
    <Input
      type="number"
      className="h-7 px-2 w-full bg-background/50 focus-visible:ring-1"
      value={value}
      onChange={e => handleChange(Number(e.target.value))}
      step={step}
      min={min}
      max={max}
      onClick={e => e.stopPropagation()}
    />
  )
}

function Text({ text }: { text: string }) {
  const isLink = useMemo(() => text.startsWith("http"), [text])
  return (
    <span
      className={cn(
        "font-normal rounded px-2 block w-full",
        "text-right overflow-hidden whitespace-nowrap text-ellipsis",
        isLink && "cursor-pointer hover:underline text-blue-500",
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

function Info(props: PropsWithChildren<{
  icon: React.ReactNode
  label: string
}>) {
  return (
    <div className="flex gap-4 items-center w-full justify-between border-b border-border/20 pb-2 mb-2 last:mb-0 last:border-0">
      <span className="flex gap-2 items-center shrink-0 text-muted-foreground">
        {props.icon}
        <span className="font-medium text-sm">{props.label}</span>
      </span>
      <div className="flex-1 min-w-0 flex justify-end max-w-40">
        {props.children}
      </div>
    </div>
  )
}

function ColorSelector({ color, editable, onChange }: { color: Color, editable?: boolean, onChange?: (color: Color) => void }) {
  if (!editable) {
    return (
      <div className="flex gap-2 items-center justify-end px-2">
        <span className={cn("inline-block w-3 h-3 rounded-full", `bg-${color}-500`)}></span>
        <span className="text-sm">{color}</span>
      </div>
    )
  }

  return (
    <Select value={color} onValueChange={val => onChange?.(val as Color)}>
      <SelectTrigger className="w-full h-7 bg-background/50" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <span className={cn("inline-block w-3 h-3 rounded-full", `bg-${color}-500`)}></span>
          <span className="text-sm">{color}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        <div className="grid grid-cols-5 gap-1 p-2">
          {COLORS.map(c => (
            <SelectItem
              key={c}
              value={c}
              className="justify-center cursor-pointer p-1"
            >
              <span className={cn("inline-block w-4 h-4 rounded-full", `bg-${c}-500`)}></span>
            </SelectItem>
          ))}
        </div>
      </SelectContent>
    </Select>
  )
}

export function CardBack() {
  const { source, onFlip } = useCard()

  const [editable, setEditable] = useState(false)
  const { namespace, name, title, desc, home, interval, color } = source

  // Local state for edits (though not persisted yet)
  // In a real app, these would update via a mutation
  const [localName, setLocalName] = useState(name)
  const [localTitle, setLocalTitle] = useState(title)
  const [localDesc, setLocalDesc] = useState(desc)
  const [localHome, setLocalHome] = useState(home)
  const [localInterval, setLocalInterval] = useState(interval)
  const [localColor, setLocalColor] = useState(color)

  useEffect(() => {
    if (!editable) {
      // Reset on cancel/exit edit
      setLocalName(name)
      setLocalTitle(title)
      setLocalDesc(desc)
      setLocalHome(home)
      setLocalInterval(interval)
      setLocalColor(color)
    }
  }, [editable, name, title, desc, home, interval, color])

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl p-4 h-full",
        `bg-${color}-400/40`,
        "transition-colors duration-300",
      )}
    >
      <div className="flex justify-between mb-3 items-center mx-1">
        <div className="flex gap-2.5 items-center ml-1">
          <img
            className="size-8 rounded-full bg-cover cursor-pointer"
            src={`https://s3.newsnext.pro/icons/${namespace}.png`}
            title={desc || name}
            onClick={() => window.open(home || "#", "_blank")}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = getFavicon(home || "#")!
            }}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">
                {name}
              </span>
              {title && (
                <span className={cn("text-sm px-1 rounded bg-background/50 opacity-80", `text-${color}-400`)}>
                  {title}
                </span>
              )}
            </div>
            <span className="text-xs opacity-70">
              Placeholder
            </span>
          </div>
        </div>
        <div className={cn("flex gap-1 items-center shrink-0", `text-${color}-400`)}>
          <IconButton
            onClick={(e) => {
              e.stopPropagation()
              onFlip()
            }}
          >
            <PhArrowCircleLeftDuotone />
          </IconButton>
          <IconButton
            onClick={(e) => {
              e.stopPropagation()
              setEditable(p => !p)
            }}
          >
            <PhPencilCircleDuotone className={cn(editable && "text-primary")} />
          </IconButton>
        </div>
      </div>

      <ScrollArea
        className={cn(
          "flex-1 rounded-xl bg-background/70 overflow-hidden",
          `sprinkle-${color}-400`,
        )}
      >
        <div
          className="p-4 space-y-4"
          onDoubleClick={(e) => {
            e.stopPropagation() // Prevent flip on double click if that's a thing
            setEditable(p => !p)
          }}
        >
          <div className="flex flex-col text-sm">
            <div className="font-semibold mb-2 opacity-80">Information</div>
            <Info icon={<PhInfoDuotone />} label="Name">
              <EditableInput text={localName} editable={editable} onChange={setLocalName} />
            </Info>

            <Info icon={<PhInfoDuotone />} label="Title">
              <EditableInput text={localTitle || ""} editable={editable} onChange={setLocalTitle} />
            </Info>

            <Info icon={<PhInfoDuotone />} label="Description">
              <EditableInput text={localDesc || ""} editable={editable} onChange={setLocalDesc} />
            </Info>

            <Info icon={<PhLinkDuotone />} label="Home">
              <EditableInput text={localHome || ""} editable={editable} onChange={setLocalHome} />
            </Info>

            <Info icon={<PhLinkDuotone />} label="Interval (min)">
              <NumberInput num={localInterval} editable={editable} min={1} onChange={setLocalInterval} />
            </Info>

            <Info icon={<PhLinkDuotone />} label="Icon">
              <EditableInput text={`https://icons.duckduckgo.com/ip3/${new URL(localHome || "http://localhost").hostname}.ico`} editable={false} />
            </Info>

            <Info icon={<PhLinkDuotone />} label="Color">
              <ColorSelector color={localColor} editable={editable} onChange={setLocalColor} />
            </Info>
          </div>

          <div className="flex flex-col gap-1 text-sm pt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold opacity-80">Parameters</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(`h-7 bg-${color}-500/10 hover:bg-${color}-500/20 text-${color}-600 border-${color}-200`)}
                >
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(`h-7 bg-${color}-500/10 hover:bg-${color}-500/20 text-${color}-600 border-${color}-200`)}
                >
                  New
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
