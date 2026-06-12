import type { ReactNode } from "react"
import type { SourceEditDraft } from "./types"
import type { BoardSource } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { ScrollArea } from "@newsnext/ui/components/scroll-area"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useState } from "react"
import {
  PhArrowCircleLeftDuotone,
  PhInfoDuotone,
  PhLinkDuotone,
  PhPencilCircleDuotone,
} from "@/components/icons/ph"
import { useRelativeTime } from "@/hooks/useRelativeTime"
import { cn } from "@/lib/utils"
import { IconButton } from "../../common/button"
import { CardHeader } from "../card-header"
import { DeleteForkButton, ForkButton } from "./actions"
import { ColorSelector, EditableInput, Info } from "./fields"
import { ParamField } from "./param-field"

export interface CardBackProps {
  id: string
  source: BoardSource
  sourceParams: Record<string, unknown>
  draftSourceParams: Record<string, unknown>
  hasSourceParams: boolean
  hasSourceParamChanges: boolean
  updatedTime: number
  onSourceParamChange: (key: string, value: unknown) => void
  onSaveSourceParams: () => void
  onResetSourceParams: () => void
  onDiscardSourceParams: () => void
  onFlip: () => void
  dragHandle?: ReactNode
}

export function CardBack({
  id,
  source,
  sourceParams,
  draftSourceParams,
  hasSourceParams,
  hasSourceParamChanges,
  updatedTime,
  onSourceParamChange,
  onSaveSourceParams,
  onResetSourceParams,
  onDiscardSourceParams,
  onFlip,
  dragHandle,
}: CardBackProps) {
  const isFork = source.isFork

  const { desc, color, params, icon, providerTitle, title, home } = source
  const [editDraft, setEditDraft] = useState<SourceEditDraft | null>(null)
  const canEdit = isFork && editDraft !== null
  const previewProviderTitle = canEdit ? editDraft.providerTitle : providerTitle
  const previewTitle = canEdit ? editDraft.title : title
  const previewDesc = canEdit ? editDraft.desc : desc
  const previewHome = canEdit ? editDraft.home : home
  const previewColor = canEdit ? editDraft.color : color
  const relativeTime = useRelativeTime({ date: updatedTime })

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
        <CardHeader
          className="mb-2"
          color={previewColor}
          desc={previewDesc}
          home={previewHome}
          icon={icon}
          providerTitle={previewProviderTitle}
          title={previewTitle}
          subtitle={previewDesc || relativeTime}
          actions={(
            <>
              <ForkButton id={id} source={source} sourceParams={sourceParams} />
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
              <DeleteForkButton id={id} isFork={isFork} />
              <IconButton
                onClick={(e) => {
                  e.stopPropagation()
                  onFlip()
                }}
              >
                <PhArrowCircleLeftDuotone />
              </IconButton>
              {dragHandle}
            </>
          )}
        />

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
