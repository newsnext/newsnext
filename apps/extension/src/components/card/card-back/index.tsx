import type { CategoryId } from "@newsnext/source/types"
import type { ReactNode } from "react"
import type { SourceEditDraft } from "./types"
import type { SourceInstanceMetadata } from "@/lib/source-cards"
import type { BoardSource } from "@/typings/source"
import { categories } from "@newsnext/source"
import { Button } from "@newsnext/ui/components/button"
import { ScrollArea } from "@newsnext/ui/components/scroll-area"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useState } from "react"
import { PhArrowCircleLeftDuotone } from "@/components/icons/ph"
import { useRelativeTime } from "@/hooks/useRelativeTime"
import { cn } from "@/lib/utils"
import { IconButton } from "../../common/button"
import { CardHeader } from "../card-header"
import { CardBoardSelect, DeleteCardButton } from "./actions"
import { ColorSelector, EditableImage, EditableInput, Info, ValueSelector } from "./fields"
import { ParamField } from "./param-field"

const SOURCE_TYPE_OPTIONS = [
  { label: "Timeline", value: "timeline" },
  { label: "Hottest", value: "hottest" },
] as const

const SOURCE_CATEGORY_OPTIONS = Object.entries(categories).map(([value, label]) => ({
  label,
  value: value as CategoryId,
}))

export interface CardBackProps {
  badge?: string
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
  badge: displayBadge,
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
  const { badge, category, desc, color, params, icon, provider, title, home, type } = source
  const [editDraft, setEditDraft] = useState<SourceEditDraft | null>(null)
  const [isEditingParams, setIsEditingParams] = useState(false)
  const isEditingMetadata = editDraft !== null
  const canEditParams = isEditingParams
  const previewTitle = isEditingMetadata ? editDraft.title : title
  const previewBadge = isEditingMetadata ? editDraft.badge : displayBadge
  const previewDesc = isEditingMetadata ? editDraft.desc : desc
  const previewHome = isEditingMetadata ? editDraft.home : home
  const previewColor = isEditingMetadata ? editDraft.color : color
  const previewIcon = isEditingMetadata ? editDraft.icon : icon
  const previewType = (isEditingMetadata ? editDraft.type : type) ?? "timeline"
  const previewCategory = (isEditingMetadata ? editDraft.category : category) ?? "others"
  const relativeTime = useRelativeTime({ date: updatedAt })
  const hasSourceMetaChanges = Boolean(
    editDraft
    && (
      editDraft.title !== title
      || editDraft.icon !== icon
      || editDraft.badge !== badge
      || editDraft.desc !== desc
      || editDraft.home !== home
      || editDraft.color !== color
      || editDraft.type !== type
      || editDraft.category !== category
    ),
  )

  function createEditDraft(): SourceEditDraft {
    return {
      title,
      icon,
      badge,
      desc,
      home,
      color,
      type,
      category,
    }
  }

  function startEditingMetadata(): void {
    setEditDraft(createEditDraft())
  }

  function updateEditDraft(patch: Partial<SourceEditDraft>): void {
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
          badge={previewBadge}
          className="mb-2"
          color={previewColor}
          desc={previewDesc}
          home={previewHome}
          icon={previewIcon}
          provider={provider}
          title={previewTitle}
          subtitle={previewDesc || relativeTime}
          actions={(
            <>
              {!isDraft && <DeleteCardButton id={id} />}
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
                            className={cn(`h-6 px-2 bg-${previewColor}-500/10 hover:bg-${previewColor}-500/20 text-${previewColor}-600 border-${previewColor}-200`)}
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
                            className={cn(`h-6 bg-${previewColor}-500 px-2 hover:bg-${previewColor}-500/80`)}
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
                          className={cn(`h-6 bg-${previewColor}-500 px-2 hover:bg-${previewColor}-500/80`)}
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

                <Info label="Icon">
                  <EditableImage
                    src={previewIcon ?? ""}
                    alt={`${previewTitle || provider.title} icon`}
                    editable={isEditingMetadata}
                    onChange={value => updateEditDraft({ icon: value || undefined })}
                  />
                </Info>

                <Info label="Badge">
                  <EditableImage
                    src={previewBadge ?? ""}
                    alt={`${previewTitle || provider.title} badge`}
                    rounded
                    editable={isEditingMetadata}
                    onChange={value => updateEditDraft({ badge: value || undefined })}
                  />
                </Info>

                <Info label="Color">
                  <ColorSelector color={previewColor} editable={isEditingMetadata} onChange={value => updateEditDraft({ color: value })} />
                </Info>

                <Info label="Type">
                  <ValueSelector
                    value={previewType}
                    options={SOURCE_TYPE_OPTIONS}
                    editable={isEditingMetadata}
                    onChange={value => updateEditDraft({ type: value })}
                  />
                </Info>

                <Info label="Category">
                  <ValueSelector
                    value={previewCategory}
                    options={SOURCE_CATEGORY_OPTIONS}
                    editable={isEditingMetadata}
                    onChange={value => updateEditDraft({ category: value })}
                  />
                </Info>
              </div>

              {hasSourceParams && (
                <div className="flex flex-col text-sm pt-0.5">
                  <div className="mb-2 flex items-start justify-between">
                    <span className="inline-block border-b border-border/60 pb-1 font-semibold opacity-80">Parameters</span>
                    {canEditParams
                      ? (
                          <div className="flex gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(`h-6 px-2 bg-${previewColor}-500/10 hover:bg-${previewColor}-500/20 text-${previewColor}-600 border-${previewColor}-200`)}
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
                              className={cn(`h-6 bg-${previewColor}-500 px-2 hover:bg-${previewColor}-500/80`)}
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
                            className={cn(`h-6 bg-${previewColor}-500 px-2 hover:bg-${previewColor}-500/80`)}
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
                      editable={canEditParams}
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
