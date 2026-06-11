import type { Color } from "@newsnext/shared/types"
import type { SourceParamSchema } from "@newsnext/sources/typings"
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
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { Switch } from "@newsnext/ui/components/switch"
import { useEffect, useMemo, useState } from "react"
import {
  PhArrowCircleLeftDuotone,
  PhForkDuotone,
  PhInfoDuotone,
  PhLinkDuotone,
  PhPencilCircleDuotone,
  PhTrashDuotone,
} from "@/components/icons/ph"
import { cn } from "@/lib/utils"
import { IconButton } from "../common/button"
import { useCard } from "./card-context"

const editableFieldClassName = "h-6 w-full rounded-3xl border border-transparent bg-transparent px-2 text-sm leading-none text-right shadow-none transition-colors hover:bg-background/40 focus-visible:border-input/50 focus-visible:bg-background/60 focus-visible:ring-1 focus-visible:ring-ring/30"
const editableSelectClassName = cn(
  editableFieldClassName,
  "py-0 data-[size=default]:h-6 data-[size=sm]:h-6 justify-end",
  "[&_[data-slot=select-value]]:justify-end [&_[data-slot=select-value]]:text-right",
)

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

function NumberInput({ num = 0, step = 1, editable, max = Infinity, min = -Infinity, onChange }: { num?: number, step?: number, editable?: boolean, max?: number, min?: number, onChange?: (value: number) => void }) {
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

function Text({ text }: { text: string }) {
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

function SelectLikeValue({ children }: PropsWithChildren) {
  return (
    <span className="flex h-6 w-full items-center justify-end gap-1.5 rounded-3xl border border-transparent px-2 leading-none">
      <span className="flex min-w-0 items-center justify-end gap-2">
        {children}
      </span>
      <span className="size-4 shrink-0" aria-hidden />
    </span>
  )
}

function ColorSwitch({ color, className }: { color: Color, className?: string }) {
  return (
    <span
      className={cn("inline-block rounded-full", className)}
      style={{ backgroundColor: `var(--color-${color}-500)` }}
    />
  )
}

function Info(props: PropsWithChildren<{
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

interface SourceEditDraft {
  providerTitle: string
  title?: string
  desc?: string
  home?: string
  color: Color
}

function ParamField({
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
        <Info icon={<PhInfoDuotone />} label={param.title}>
          <SelectLikeValue>
            <span className="truncate text-sm">
              {selectedOption?.label ?? String(currentValue)}
            </span>
          </SelectLikeValue>
        </Info>
      )
    }

    return (
      <Info icon={<PhInfoDuotone />} label={param.title}>
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
        <Info icon={<PhInfoDuotone />} label={param.title}>
          <Text text={selectedLabels.length > 0 ? selectedLabels.join(", ") : "None"} />
        </Info>
      )
    }

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

export function CardBack() {
  const {
    source,
    draftSourceParams,
    hasSourceParams,
    hasSourceParamChanges,
    isFork,
    onFork,
    onDelete,
    onSourceParamChange,
    onSaveSourceParams,
    onResetSourceParams,
    onDiscardSourceParams,
    onFlip,
    dragHandle,
  } = useCard()

  const shouldPromoteEditButton = !dragHandle
  const { desc, color, params, icon, providerTitle, title, home } = source
  const [editDraft, setEditDraft] = useState<SourceEditDraft | null>(null)
  const canEdit = isFork && editDraft !== null
  const previewProviderTitle = canEdit ? editDraft.providerTitle : providerTitle
  const previewTitle = canEdit ? editDraft.title : title
  const previewDesc = canEdit ? editDraft.desc : desc
  const previewHome = canEdit ? editDraft.home : home
  const previewColor = canEdit ? editDraft.color : color

  function createEditDraft(): SourceEditDraft {
    return {
      providerTitle,
      title,
      desc,
      home,
      color,
    }
  }

  function toggleEdit(): void {
    if (!isFork) {
      return
    }

    setEditDraft(prev => prev ? null : createEditDraft())
  }

  function updateEditDraft(patch: Partial<SourceEditDraft>): void {
    setEditDraft(prev => prev ? { ...prev, ...patch } : prev)
  }

  return (
    <div className="relative h-full">
      <SquircleBox
        aria-hidden
        radius="3xl"
        className={cn(
          "pointer-events-none absolute inset-0 transition-colors duration-300",
          `bg-${previewColor}-400/40`,
        )}
      />
      <div className="relative flex h-full flex-col p-3 transition-colors duration-300">
        <div className="flex justify-between mb-2 items-center mx-1">
          <div className="flex gap-2.5 items-center ml-1">
            <button
              type="button"
              className="size-8 shrink-0 rounded-full"
              title={previewDesc || previewProviderTitle}
              onClick={() => window.open(previewHome || "#", "_blank")}
            >
              <img
                className="size-full rounded-full bg-cover"
                src={icon}
                alt={`${previewProviderTitle} icon`}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = getFavicon(previewHome || "#")!
                }}
              />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">
                  {previewProviderTitle}
                </span>
                {previewTitle && (
                  <span className={cn("text-sm px-1 rounded-3xl bg-background/50 opacity-80", `text-${previewColor}-400`)}>
                    {previewTitle}
                  </span>
                )}
              </div>
              <span className="text-xs opacity-70">
                Placeholder
              </span>
            </div>
          </div>
          <div className={cn("flex gap-1 items-center shrink-0", `text-${previewColor}-400`)}>
            <IconButton
              onClick={(e) => {
                e.stopPropagation()
                onFork()
              }}
              aria-label="Fork"
              title="Fork"
            >
              <PhForkDuotone />
            </IconButton>
            {shouldPromoteEditButton && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isFork) {
                    return
                  }

                  toggleEdit()
                }}
                aria-label="Edit"
                title={isFork ? "Edit" : "Only forked cards can be edited"}
              >
                <PhPencilCircleDuotone className={cn(canEdit && "text-primary", !isFork && "opacity-40")} />
              </IconButton>
            )}
            {isFork && (
              <IconButton
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                aria-label="Delete Fork"
                title="Delete Fork"
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
                  if (!isFork) {
                    return
                  }

                  toggleEdit()
                }}
                aria-label="Edit"
                title={isFork ? "Edit" : "Only forked cards can be edited"}
              >
                <PhPencilCircleDuotone className={cn(canEdit && "text-primary", !isFork && "opacity-40")} />
              </IconButton>
            )}
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <SquircleBox
            aria-hidden
            radius="2xl"
            className={cn(
              "pointer-events-none absolute inset-0 bg-background/70",
              `sprinkle-${previewColor}-400`,
            )}
          />
          <ScrollArea
            onPointerDown={event => event.stopPropagation()}
            className="relative size-full rounded-2xl overflow-hidden"
          >
            <div
              className="px-3 py-2 space-y-2"
              onDoubleClick={(e) => {
                e.stopPropagation() // Prevent flip on double click if that's a thing
                if (!isFork) {
                  return
                }

                toggleEdit()
              }}
            >
              <div className="flex flex-col text-sm">
                <div className="font-semibold mb-1 opacity-80">Information</div>
                <Info icon={<PhInfoDuotone />} label="Provider Title">
                  <EditableInput text={previewProviderTitle} editable={canEdit} onChange={value => updateEditDraft({ providerTitle: value })} />
                </Info>

                <Info icon={<PhInfoDuotone />} label="Title">
                  <EditableInput text={previewTitle || ""} editable={canEdit} onChange={value => updateEditDraft({ title: value })} />
                </Info>

                <Info icon={<PhInfoDuotone />} label="Description">
                  <EditableInput text={previewDesc || ""} editable={canEdit} onChange={value => updateEditDraft({ desc: value })} />
                </Info>

                <Info icon={<PhLinkDuotone />} label="Home">
                  <EditableInput text={previewHome || ""} editable={canEdit} onChange={value => updateEditDraft({ home: value })} />
                </Info>

                <Info icon={<PhLinkDuotone />} label="Icon">
                  <EditableInput text={`https://icons.duckduckgo.com/ip3/${new URL(previewHome || "http://localhost").hostname}.ico`} editable={false} />
                </Info>

                <Info icon={<PhLinkDuotone />} label="Color">
                  <ColorSelector color={previewColor} editable={canEdit} onChange={value => updateEditDraft({ color: value })} />
                </Info>
              </div>

              <div className="flex flex-col text-sm pt-0.5">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold opacity-80">Parameters</span>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canEdit || !hasSourceParamChanges}
                      className={cn(`h-6 px-2 bg-${previewColor}-500/10 hover:bg-${previewColor}-500/20 text-${previewColor}-600 border-${previewColor}-200`)}
                      onClick={(event) => {
                        event.stopPropagation()
                        onDiscardSourceParams()
                      }}
                    >
                      Revert
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canEdit || !hasSourceParams}
                      className={cn(`h-6 px-2 bg-${previewColor}-500/10 hover:bg-${previewColor}-500/20 text-${previewColor}-600 border-${previewColor}-200`)}
                      onClick={(event) => {
                        event.stopPropagation()
                        onResetSourceParams()
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canEdit || !hasSourceParamChanges}
                      className="h-6 px-2"
                      onClick={(event) => {
                        event.stopPropagation()
                        onSaveSourceParams()
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </div>
                {!hasSourceParams && (
                  <div className="rounded-3xl border border-dashed border-border/50 px-3 py-2.5 text-sm text-muted-foreground">
                    This source does not expose configurable parameters yet.
                  </div>
                )}
                {params && Object.entries(params).map(([paramKey, param]) => (
                  <ParamField
                    key={paramKey}
                    param={param}
                    value={draftSourceParams[paramKey]}
                    editable={canEdit}
                    color={previewColor}
                    onChange={nextValue => onSourceParamChange(paramKey, nextValue)}
                  />
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
