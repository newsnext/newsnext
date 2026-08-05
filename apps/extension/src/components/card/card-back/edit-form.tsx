import type { SourceInstanceMetadata } from "@/lib/source-cards"
import type { BoardSource } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { useEffect, useState } from "react"
import { EditableImage, EditableInput, Info } from "./fields"
import { ParamField } from "./param-field"

export interface CardEditFormProps {
  source: BoardSource
  draftSourceParams: Record<string, unknown>
  hasSourceParams: boolean
  hasSourceParamChanges: boolean
  onSourceParamChange: (key: string, value: unknown) => void
  onSaveSourceParams: () => void
  onResetSourceParams: () => void
  onDiscardSourceParams: () => void
  onSaveSourceMeta: (meta: SourceInstanceMetadata) => void
  onPreviewMetadataChange?: (meta: SourceInstanceMetadata | null) => void
}

export function CardEditForm({
  source,
  draftSourceParams,
  hasSourceParams,
  hasSourceParamChanges,
  onSourceParamChange,
  onSaveSourceParams,
  onResetSourceParams,
  onDiscardSourceParams,
  onSaveSourceMeta,
  onPreviewMetadataChange,
}: CardEditFormProps): React.JSX.Element {
  const { params, provider } = source
  const { badge, desc, home, title } = source.metadata
  const [editDraft, setEditDraft] = useState<SourceInstanceMetadata | null>(null)
  const [isEditingParams, setIsEditingParams] = useState(false)
  const isEditingMetadata = editDraft !== null
  const previewTitle = editDraft?.title ?? title
  const previewBadge = editDraft?.badge ?? badge
  const previewDesc = editDraft?.desc ?? desc
  const previewHome = editDraft?.home ?? home
  const hasSourceMetaChanges = Boolean(editDraft && Object.keys(editDraft).length > 0)

  useEffect(() => {
    onPreviewMetadataChange?.(editDraft)
  }, [editDraft, onPreviewMetadataChange])

  function updateEditDraft(patch: Partial<SourceInstanceMetadata>): void {
    setEditDraft(prev => prev ? { ...prev, ...patch } : prev)
  }

  function saveEditDraft(): void {
    if (!editDraft) return
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
    <div className="space-y-4">
      <section className="flex flex-col text-sm">
        <div className="mb-2 flex items-start justify-between">
          <span className="inline-block border-b border-border/60 pb-1 font-semibold opacity-80">Metadata</span>
          {isEditingMetadata
            ? (
                <div className="flex gap-1.5">
                  <Button type="button" variant="outline" tone="theme" size="sm" className="h-6 px-2" onClick={() => setEditDraft(null)}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" tone="theme" disabled={!hasSourceMetaChanges} className="h-6 px-2" onClick={saveEditDraft}>
                    Save
                  </Button>
                </div>
              )
            : (
                <Button type="button" size="sm" tone="theme" title="Edit metadata" className="h-6 px-2" onClick={() => setEditDraft({})}>
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
      </section>

      {hasSourceParams && (
        <section className="flex flex-col pt-0.5 text-sm">
          <div className="mb-2 flex items-start justify-between">
            <span className="inline-block border-b border-border/60 pb-1 font-semibold opacity-80">Parameters</span>
            {isEditingParams
              ? (
                  <div className="flex gap-1.5">
                    <Button type="button" variant="outline" tone="theme" size="sm" className="h-6 px-2" onClick={cancelEditingParams}>
                      Cancel
                    </Button>
                    <Button type="button" variant="outline" tone="theme" size="sm" disabled={!hasSourceParams} className="h-6 px-2" onClick={onResetSourceParams}>
                      Reset
                    </Button>
                    <Button type="button" size="sm" tone="theme" disabled={!hasSourceParamChanges} className="h-6 px-2" onClick={saveParams}>
                      Save
                    </Button>
                  </div>
                )
              : (
                  <Button type="button" size="sm" tone="theme" title="Edit parameters" className="h-6 px-2" onClick={startEditingParams}>
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
              onChange={nextValue => onSourceParamChange(paramKey, nextValue)}
            />
          ))}
        </section>
      )}
    </div>
  )
}
