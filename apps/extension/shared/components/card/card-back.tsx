import type { FeedParamSchema } from "@newsnext/feeds/typings"
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
  SelectValue,
} from "@newsnext/ui/components/select"
import { Switch } from "@newsnext/ui/components/switch"
import { useEffect, useMemo, useState } from "react"
import {
  PhArrowCircleLeftDuotone,
  PhCopyDuotone,
  PhInfoDuotone,
  PhLinkDuotone,
  PhPencilCircleDuotone,
  PhTrashDuotone,
} from "@/components/icons/ph"
import { resolveFeedDisplay } from "@/lib/feed-display"
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
        "font-normal rounded-3xl px-2 block w-full",
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

function ParamField({
  param,
  value,
  editable,
  color,
  onChange,
}: {
  param: FeedParamSchema
  value: unknown
  editable: boolean
  color: Color
  onChange: (value: unknown) => void
}) {
  const currentValue = value ?? param.default

  if (param.type === "switch") {
    return (
      <Info icon={<PhInfoDuotone />} label={param.title}>
        <div className="flex items-center justify-end gap-3 px-2">
          <span className="text-xs text-muted-foreground">
            {currentValue ? "On" : "Off"}
          </span>
          <Switch
            checked={Boolean(currentValue)}
            disabled={!editable}
            onCheckedChange={checked => onChange(checked)}
            size="sm"
          />
        </div>
      </Info>
    )
  }

  if (param.type === "select") {
    return (
      <Info icon={<PhInfoDuotone />} label={param.title}>
        <Select
          value={String(currentValue)}
          disabled={!editable}
          onValueChange={nextValue => onChange(nextValue)}
        >
          <SelectTrigger className="w-full h-7 bg-background/50" onClick={e => e.stopPropagation()}>
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

    return (
      <Info icon={<PhInfoDuotone />} label={param.title}>
        <div className="flex flex-wrap justify-end gap-1">
          {param.options.map((option) => {
            const isSelected = selectedValues.includes(option.value)
            return (
              <Button
                key={option.value}
                type="button"
                size="xs"
                variant={isSelected ? "default" : "outline"}
                disabled={!editable}
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
      <Info icon={<PhInfoDuotone />} label={param.title}>
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
    <Info icon={<PhInfoDuotone />} label={param.title}>
      <EditableInput
        text={String(currentValue ?? "")}
        editable={editable}
        onChange={nextValue => onChange(nextValue)}
      />
    </Info>
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
  const {
    feed,
    draftFeedParams,
    hasFeedParams,
    hasFeedParamChanges,
    isCopy,
    onCopy,
    onDelete,
    onFeedParamChange,
    onSaveFeedParams,
    onResetFeedParams,
    onDiscardFeedParams,
    onFlip,
    dragHandle,
  } = useCard()

  const [editable, setEditable] = useState(false)
  const canEdit = isCopy && editable
  const shouldPromoteEditButton = !dragHandle
  const { provider, desc, interval, color, params } = feed
  const { name, title, home } = resolveFeedDisplay(feed, draftFeedParams)

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

  useEffect(() => {
    if (!isCopy) {
      setEditable(false)
    }
  }, [isCopy])

  return (
    <div
      className={cn(
        "flex flex-col rounded-4xl p-3 h-full",
        `bg-${color}-400/40`,
        "transition-colors duration-300",
      )}
    >
      <div className="flex justify-between mb-3 items-center mx-1">
        <div className="flex gap-2.5 items-center ml-1">
          <img
            className="size-8 rounded-full bg-cover cursor-pointer"
            src={`https://s3.newsnext.pro/icons/${provider}.png`}
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
                <span className={cn("text-sm px-1 rounded-3xl bg-background/50 opacity-80", `text-${color}-400`)}>
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
              onCopy()
            }}
            aria-label="Copy"
            title="Copy"
          >
            <PhCopyDuotone />
          </IconButton>
          {shouldPromoteEditButton && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                if (!isCopy) {
                  return
                }

                setEditable(p => !p)
              }}
              aria-label="Edit"
              title={isCopy ? "Edit" : "Only copied cards can be edited"}
            >
              <PhPencilCircleDuotone className={cn(canEdit && "text-primary", !isCopy && "opacity-40")} />
            </IconButton>
          )}
          {isCopy && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              aria-label="Delete Copy"
              title="Delete Copy"
            >
              <PhTrashDuotone />
            </IconButton>
          )}
          <IconButton
            onClick={(e) => {
              e.stopPropagation()
              onFlip()
            }}
          >
            <PhArrowCircleLeftDuotone />
          </IconButton>
          {!shouldPromoteEditButton && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                if (!isCopy) {
                  return
                }

                setEditable(p => !p)
              }}
              aria-label="Edit"
              title={isCopy ? "Edit" : "Only copied cards can be edited"}
            >
              <PhPencilCircleDuotone className={cn(canEdit && "text-primary", !isCopy && "opacity-40")} />
            </IconButton>
          )}
        </div>
      </div>

      <ScrollArea
        className={cn(
          "flex-1 rounded-3xl bg-background/70 overflow-hidden",
          `sprinkle-${color}-400`,
        )}
      >
        <div
          className="p-4 space-y-4"
          onDoubleClick={(e) => {
            e.stopPropagation() // Prevent flip on double click if that's a thing
            if (!isCopy) {
              return
            }

            setEditable(p => !p)
          }}
        >
          <div className="flex flex-col text-sm">
            <div className="font-semibold mb-2 opacity-80">Information</div>
            <Info icon={<PhInfoDuotone />} label="Name">
              <EditableInput text={localName} editable={canEdit} onChange={setLocalName} />
            </Info>

            <Info icon={<PhInfoDuotone />} label="Title">
              <EditableInput text={localTitle || ""} editable={canEdit} onChange={setLocalTitle} />
            </Info>

            <Info icon={<PhInfoDuotone />} label="Description">
              <EditableInput text={localDesc || ""} editable={canEdit} onChange={setLocalDesc} />
            </Info>

            <Info icon={<PhLinkDuotone />} label="Home">
              <EditableInput text={localHome || ""} editable={canEdit} onChange={setLocalHome} />
            </Info>

            <Info icon={<PhLinkDuotone />} label="Interval (min)">
              <NumberInput num={localInterval} editable={canEdit} min={1} onChange={setLocalInterval} />
            </Info>

            <Info icon={<PhLinkDuotone />} label="Icon">
              <EditableInput text={`https://icons.duckduckgo.com/ip3/${new URL(localHome || "http://localhost").hostname}.ico`} editable={false} />
            </Info>

            <Info icon={<PhLinkDuotone />} label="Color">
              <ColorSelector color={localColor} editable={canEdit} onChange={setLocalColor} />
            </Info>
          </div>

          <div className="flex flex-col gap-1 text-sm pt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold opacity-80">Parameters</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canEdit || !hasFeedParamChanges}
                  className={cn(`h-7 bg-${color}-500/10 hover:bg-${color}-500/20 text-${color}-600 border-${color}-200`)}
                  onClick={(event) => {
                    event.stopPropagation()
                    onDiscardFeedParams()
                  }}
                >
                  Revert
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canEdit || !hasFeedParams}
                  className={cn(`h-7 bg-${color}-500/10 hover:bg-${color}-500/20 text-${color}-600 border-${color}-200`)}
                  onClick={(event) => {
                    event.stopPropagation()
                    onResetFeedParams()
                  }}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!canEdit || !hasFeedParamChanges}
                  className="h-7"
                  onClick={(event) => {
                    event.stopPropagation()
                    onSaveFeedParams()
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
            {!hasFeedParams && (
              <div className="rounded-3xl border border-dashed border-border/50 px-3 py-4 text-sm text-muted-foreground">
                This feed does not expose configurable parameters yet.
              </div>
            )}
            {params && Object.entries(params).map(([paramKey, param]) => (
              <ParamField
                key={paramKey}
                param={param}
                value={draftFeedParams[paramKey]}
                editable={canEdit}
                color={color}
                onChange={nextValue => onFeedParamChange(paramKey, nextValue)}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
