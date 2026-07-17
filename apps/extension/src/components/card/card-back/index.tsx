import type { ReactNode } from "react"
import type { SourceEditDraft } from "./types"
import type { SourceInstanceMeta } from "@/lib/source-cards"
import type { BoardSource } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { ScrollArea } from "@newsnext/ui/components/scroll-area"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useState } from "react"
import {
  PhArrowCircleLeftDuotone,
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
  updatedAt: number
  onSourceParamChange: (key: string, value: unknown) => void
  onSaveSourceParams: () => void
  onResetSourceParams: () => void
  onDiscardSourceParams: () => void
  onSaveSourceMeta: (meta: SourceInstanceMeta) => void
  onFlip: () => void
  isDraft?: boolean
  dragHandle?: ReactNode
}

export function CardBack({
  id,
  source,
  sourceParams,
  draftSourceParams,
  hasSourceParams,
  hasSourceParamChanges,
  updatedAt,
  onSourceParamChange,
  onSaveSourceParams,
  onResetSourceParams,
  onDiscardSourceParams,
  onSaveSourceMeta,
  onFlip,
  isDraft = false,
  dragHandle,
}: CardBackProps) {
  const isCustom = source.isCustom

  const { desc, color, params, icon, providerTitle, title, home } = source
  const [editDraft, setEditDraft] = useState<SourceEditDraft | null>(null)
  const canEdit = isCustom && editDraft !== null
  const previewProviderTitle = canEdit ? editDraft.providerTitle : providerTitle
  const previewTitle = canEdit ? editDraft.title : title
  const previewDesc = canEdit ? editDraft.desc : desc
  const previewHome = canEdit ? editDraft.home : home
  const previewColor = canEdit ? editDraft.color : color
  const relativeTime = useRelativeTime({ date: updatedAt })
  const hasSourceMetaChanges = Boolean(
    editDraft
    && (
      editDraft.providerTitle !== providerTitle
      || editDraft.title !== title
      || editDraft.desc !== desc
      || editDraft.home !== home
      || editDraft.color !== color
    ),
  )

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
    if (!isCustom) {
      return
    }

    setEditDraft(prev => prev ? null : createEditDraft())
  }

  function updateEditDraft(patch: Partial<SourceEditDraft>): void {
    setEditDraft(prev => prev ? { ...prev, ...patch } : prev)
  }

  function discardEditDraft(): void {
    setEditDraft(createEditDraft())
  }

  function saveEditDraft(): void {
    if (!editDraft) {
      return
    }

    onSaveSourceMeta(editDraft)
    setEditDraft(null)
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
              {!isDraft && <ForkButton id={id} source={source} sourceParams={sourceParams} />}
              <IconButton
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isCustom) {
                    return
                  }

                  toggleEdit()
                }}
                aria-label="Edit"
                title={isCustom ? "Edit" : "Only custom cards can be edited"}
              >
                <PhPencilCircleDuotone className={cn(canEdit && "text-primary", !isCustom && "opacity-40")} />
              </IconButton>
              {!isDraft && <DeleteForkButton id={id} isCustom={isCustom} />}
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
              `sunrise-${previewColor}-400`,
            )}
          />
          <ScrollArea
            onPointerDown={event => event.stopPropagation()}
            className="relative size-full rounded-2xl overflow-hidden"
          >
            <div
              className="px-3 py-2 space-y-4"
              onDoubleClick={(e) => {
                e.stopPropagation() // Prevent flip on double click if that's a thing
                if (!isCustom) {
                  return
                }

                toggleEdit()
              }}
            >
              <div className="flex flex-col text-sm">
                <div className="mb-2 flex items-start justify-between">
                  <span className="inline-block font-semibold opacity-80">Information</span>
                  {canEdit && (
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!hasSourceMetaChanges}
                        className={cn(`h-6 px-2 bg-${previewColor}-500/10 hover:bg-${previewColor}-500/20 text-${previewColor}-600 border-${previewColor}-200`)}
                        onClick={(event) => {
                          event.stopPropagation()
                          discardEditDraft()
                        }}
                      >
                        Revert
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!hasSourceMetaChanges}
                        className="h-6 px-2"
                        onClick={(event) => {
                          event.stopPropagation()
                          saveEditDraft()
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
                <Info label="Provider Title">
                  <EditableInput text={previewProviderTitle} editable={canEdit} onChange={value => updateEditDraft({ providerTitle: value })} />
                </Info>

                <Info label="Title">
                  <EditableInput text={previewTitle || ""} editable={canEdit} onChange={value => updateEditDraft({ title: value })} />
                </Info>

                <Info label="Description">
                  <EditableInput text={previewDesc || ""} editable={canEdit} onChange={value => updateEditDraft({ desc: value })} />
                </Info>

                <Info label="Home">
                  <EditableInput text={previewHome || ""} editable={canEdit} onChange={value => updateEditDraft({ home: value })} />
                </Info>

                <Info label="Icon">
                  <EditableInput text={source.icon ?? ""} editable={false} />
                </Info>

                <Info label="Color">
                  <ColorSelector color={previewColor} editable={canEdit} onChange={value => updateEditDraft({ color: value })} />
                </Info>
              </div>

              {hasSourceParams && (
                <div className="flex flex-col text-sm pt-0.5">
                  <div className="mb-2 flex items-start justify-between">
                    <span className="inline-block border-b border-border/60 pb-1 font-semibold opacity-80">Parameters</span>
                    {canEdit && (
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!hasSourceParamChanges}
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
                          disabled={!hasSourceParams}
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
                          disabled={!hasSourceParamChanges}
                          className="h-6 px-2"
                          onClick={(event) => {
                            event.stopPropagation()
                            onSaveSourceParams()
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    )}
                  </div>
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
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
