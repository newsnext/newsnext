import type { ReactNode } from "react"
import type { SourceInstanceMetadata } from "@/lib/source-cards"
import type { BoardSource } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { ScrollArea } from "@newsnext/ui/components/scroll-area"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useState } from "react"
import { PhArrowCircleLeftDuotone } from "@/components/icons/ph"
import { useSourceIcon } from "@/hooks/use-source-icon"
import { useRelativeTime } from "@/hooks/useRelativeTime"
import { cn } from "@/lib/utils"
import { CardHeader } from "../card-header"
import { CardSurface } from "../card-surface"
import { CardBoardSelect, DeleteCardButton } from "./actions"
import { EditableImage, EditableInput, Info } from "./fields"
import { ParamField } from "./param-field"

export interface CardBackProps {
  id: string
  source: BoardSource
  draftSourceParams: Record<string, unknown>
  hasSourceParams: boolean
  hasSourceParamChanges: boolean
  updatedAt: number
  onSourceParamChange: (key: string, value: unknown) => void
  onSaveSourceParams: () => void
  onResetSourceParams: () => void
  onDiscardSourceParams: () => void
  onSaveSourceMeta: (meta: SourceInstanceMetadata) => void
  onFlip: () => void
  isDraft?: boolean
  dragHandle?: ReactNode
}

export function CardBack({
  id,
  source,
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
  const { params, provider } = source
  const { badge, desc, home, title } = source.metadata
  const { color } = provider
  const [editDraft, setEditDraft] = useState<SourceInstanceMetadata | null>(null)
  const [isEditingParams, setIsEditingParams] = useState(false)
  const isEditingMetadata = editDraft !== null
  const previewTitle = editDraft?.title ?? title
  const previewBadge = editDraft?.badge ?? badge
  const previewDesc = editDraft?.desc ?? desc
  const previewHome = editDraft?.home ?? home
  const icon = useSourceIcon({
    provider,
    metadata: { home: previewHome },
  })
  const relativeTime = useRelativeTime({ date: updatedAt })
  const hasSourceMetaChanges = Boolean(editDraft && Object.keys(editDraft).length > 0)

  function startEditingMetadata(): void {
    setEditDraft({})
  }

  function updateEditDraft(patch: Partial<SourceInstanceMetadata>): void {
    setEditDraft(prev => prev ? { ...prev, ...patch } : prev)
  }

  function cancelEditingMetadata(): void {
    setEditDraft(null)
  }

  function saveEditDraft(): void {
    if (!editDraft) {
      return
    }

    onSaveSourceMeta(editDraft)
    setEditDraft(null)
  }

  function startEditingParams(): void {
    onDiscardSourceParams()
    setIsEditingParams(true)
  }

  function cancelEditingParams(): void {
    onDiscardSourceParams()
    setIsEditingParams(false)
  }

  function saveParams(): void {
    onSaveSourceParams()
    setIsEditingParams(false)
  }

  return (
    <div className="relative h-full">
      <CardSurface color={color} className="transition-colors duration-300" />
      <div className="relative flex h-full flex-col p-2.5 transition-colors duration-300">
        <CardHeader
          badge={previewBadge}
          className="mb-2"
          color={color}
          desc={previewDesc}
          home={previewHome}
          icon={icon}
          provider={provider}
          title={previewTitle}
          subtitle={previewDesc || relativeTime}
          actions={(
            <>
              {!isDraft && <DeleteCardButton id={id} />}
              <Button
                variant="quiet"
                size="icon-fit"
                onClick={(e) => {
                  e.stopPropagation()
                  onFlip()
                }}
              >
                <PhArrowCircleLeftDuotone />
              </Button>
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
              `sunrise-${color}-400`,
            )}
          />
          <ScrollArea
            onPointerDown={event => event.stopPropagation()}
            className="relative size-full rounded-2xl overflow-hidden"
          >
            <div className="p-3 space-y-4">
              {!isDraft && <CardBoardSelect id={id} boardId={source.boardId} />}
              <div className="flex flex-col text-sm">
                <div className="mb-2 flex items-start justify-between">
                  <span className="inline-block border-b border-border/60 pb-1 font-semibold opacity-80">Metadata</span>
                  {isEditingMetadata
                    ? (
                        <div className="flex gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={cn(`h-6 px-2 bg-${color}-500/10 hover:bg-${color}-500/20 text-${color}-600 border-${color}-200`)}
                            onClick={(event) => {
                              event.stopPropagation()
                              cancelEditingMetadata()
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!hasSourceMetaChanges}
                            className={cn(`h-6 bg-${color}-500 px-2 hover:bg-${color}-500/80`)}
                            onClick={(event) => {
                              event.stopPropagation()
                              saveEditDraft()
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      )
                    : (
                        <Button
                          type="button"
                          size="sm"
                          title="Edit metadata"
                          className={cn(`h-6 bg-${color}-500 px-2 hover:bg-${color}-500/80`)}
                          onClick={(event) => {
                            event.stopPropagation()
                            startEditingMetadata()
                          }}
                        >
                          Edit
                        </Button>
                      )}
                </div>
                <Info label="Title">
                  <EditableInput text={previewTitle || ""} editable={isEditingMetadata} onChange={value => updateEditDraft({ title: value })} />
                </Info>

                <Info label="Description">
                  <EditableInput text={previewDesc || ""} editable={isEditingMetadata} onChange={value => updateEditDraft({ desc: value })} />
                </Info>

                <Info label="Home">
                  <EditableInput text={previewHome || ""} editable={isEditingMetadata} onChange={value => updateEditDraft({ home: value })} />
                </Info>

                <Info label="Badge">
                  <EditableImage
                    src={previewBadge ?? ""}
                    alt={`${previewTitle || provider.title} badge`}
                    rounded
                    editable={isEditingMetadata}
                    onChange={value => updateEditDraft({ badge: value })}
                  />
                </Info>

              </div>

              {hasSourceParams && (
                <div className="flex flex-col text-sm pt-0.5">
                  <div className="mb-2 flex items-start justify-between">
                    <span className="inline-block border-b border-border/60 pb-1 font-semibold opacity-80">Parameters</span>
                    {isEditingParams
                      ? (
                          <div className="flex gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(`h-6 px-2 bg-${color}-500/10 hover:bg-${color}-500/20 text-${color}-600 border-${color}-200`)}
                              onClick={(event) => {
                                event.stopPropagation()
                                cancelEditingParams()
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!hasSourceParams}
                              className={cn(`h-6 px-2 bg-${color}-500/10 hover:bg-${color}-500/20 text-${color}-600 border-${color}-200`)}
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
                              className={cn(`h-6 bg-${color}-500 px-2 hover:bg-${color}-500/80`)}
                              onClick={(event) => {
                                event.stopPropagation()
                                saveParams()
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        )
                      : (
                          <Button
                            type="button"
                            size="sm"
                            title="Edit parameters"
                            className={cn(`h-6 bg-${color}-500 px-2 hover:bg-${color}-500/80`)}
                            onClick={(event) => {
                              event.stopPropagation()
                              startEditingParams()
                            }}
                          >
                            Edit
                          </Button>
                        )}
                  </div>
                  {params && Object.entries(params).map(([paramKey, param]) => (
                    <ParamField
                      key={paramKey}
                      param={param}
                      value={draftSourceParams[paramKey]}
                      editable={isEditingParams}
                      color={color}
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
