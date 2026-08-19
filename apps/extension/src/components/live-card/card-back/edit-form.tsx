import type { SourceInstanceMetadata } from "@/lib/source"
import type { LiveCardViewModel } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { useEffect, useState } from "react"
import { useAsyncAction } from "@/hooks/use-async-action"
import { getHostPermissionOrigins, getPermissionRequestForSource } from "@/lib/source"
import { SourcePermissionDetails } from "../source-permission-details"
import { EditableImage, EditableInput, Info } from "./fields"
import { ParamField } from "./param-field"

export interface LiveCardEditFormProps {
  source: LiveCardViewModel
  draftSourceParams: Record<string, unknown>
  hasSourceParams: boolean
  hasSourceParamChanges: boolean
  sourceParamValidation: SourceParamValidationState
  onSourceParamChange: (key: string, value: unknown) => void
  onSaveSourceParams: () => Promise<void> | void
  onResetSourceParams: () => Promise<void> | void
  onDiscardSourceParams: () => void
  onSaveSourceMeta: (meta: SourceInstanceMetadata) => Promise<void> | void
  onPreviewMetadataChange?: (meta: SourceInstanceMetadata | null) => void
}

export interface SourceParamValidationState {
  errors: Record<string, string | undefined>
  valid: boolean
}

export function LiveCardEditForm({
  source,
  draftSourceParams,
  hasSourceParams,
  hasSourceParamChanges,
  sourceParamValidation,
  onSourceParamChange,
  onSaveSourceParams,
  onResetSourceParams,
  onDiscardSourceParams,
  onSaveSourceMeta,
  onPreviewMetadataChange,
}: LiveCardEditFormProps): React.JSX.Element {
  const { params, provider } = source
  const { badge, desc, home, title } = source.metadata
  const [editDraft, setEditDraft] = useState<SourceInstanceMetadata | null>(null)
  const [isEditingParams, setIsEditingParams] = useState(false)
  const { error: saveError, isPending: isSaving, run: runSave } = useAsyncAction(
    "The LiveCard could not be saved.",
  )
  const isEditingMetadata = editDraft !== null
  const previewTitle = editDraft?.title ?? title
  const previewBadge = editDraft?.badge ?? badge
  const previewDesc = editDraft?.desc ?? desc
  const previewHome = editDraft?.home ?? home
  const hasSourceMetaChanges = Boolean(editDraft && Object.keys(editDraft).length > 0)
  const permissionRequest = getPermissionRequestForSource(source, draftSourceParams)
  const cookieOrigins = getHostPermissionOrigins({
    cookies: source.capabilities.cookies,
    network: [],
  })

  useEffect(() => {
    onPreviewMetadataChange?.(editDraft)
  }, [editDraft, onPreviewMetadataChange])

  function updateEditDraft(patch: Partial<SourceInstanceMetadata>): void {
    setEditDraft(prev => prev ? { ...prev, ...patch } : prev)
  }

  async function saveEditDraft(): Promise<void> {
    if (!editDraft) return
    await runSave(async () => {
      await onSaveSourceMeta(editDraft)
      setEditDraft(null)
    })
  }

  function startEditingParams(): void {
    onDiscardSourceParams()
    setIsEditingParams(true)
  }

  function cancelEditingParams(): void {
    onDiscardSourceParams()
    setIsEditingParams(false)
  }

  async function saveParams(): Promise<void> {
    await runSave(async () => {
      await onSaveSourceParams()
      setIsEditingParams(false)
    })
  }

  async function resetParams(): Promise<void> {
    await runSave(async () => {
      await onResetSourceParams()
      setIsEditingParams(false)
    })
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-col text-sm">
        <div className="mb-2 flex items-start justify-between">
          <span className="inline-block border-b border-border/60 pb-1 font-semibold opacity-80">Metadata</span>
          {isEditingMetadata
            ? (
                <div className="flex gap-1.5">
                  <Button type="button" variant="outline" tone="theme" size="sm" disabled={isSaving} className="h-6 px-2" onClick={() => setEditDraft(null)}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" tone="theme" disabled={!hasSourceMetaChanges || isSaving} className="h-6 px-2" onClick={() => void saveEditDraft()}>
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
                    <Button type="button" variant="outline" tone="theme" size="sm" disabled={isSaving} className="h-6 px-2" onClick={cancelEditingParams}>
                      Cancel
                    </Button>
                    <Button type="button" variant="outline" tone="theme" size="sm" disabled={!hasSourceParams || isSaving} className="h-6 px-2" onClick={() => void resetParams()}>
                      Reset
                    </Button>
                    <Button type="button" size="sm" tone="theme" disabled={!hasSourceParamChanges || !sourceParamValidation.valid || isSaving} className="h-6 px-2" onClick={() => void saveParams()}>
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
          {params && Object.entries(params).map(([paramKey, param]) => {
            const error = sourceParamValidation.errors[paramKey]
            return (
              <div key={paramKey}>
                <ParamField
                  param={param}
                  value={draftSourceParams[paramKey]}
                  editable={isEditingParams}
                  onChange={nextValue => onSourceParamChange(paramKey, nextValue)}
                />
                {isEditingParams && error && (
                  <p role="alert" className="mb-1 text-right text-xs text-destructive">
                    {error}
                  </p>
                )}
              </div>
            )
          })}
        </section>
      )}
      <section className="flex flex-col pt-0.5 text-sm">
        <div className="mb-2 flex items-start justify-between">
          <span className="inline-block border-b border-border/60 pb-1 font-semibold opacity-80">Permissions</span>
        </div>
        {permissionRequest
          ? <SourcePermissionDetails cookieOrigins={cookieOrigins} request={permissionRequest} />
          : <p className="text-muted-foreground">No additional permissions</p>}
      </section>
      {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
    </div>
  )
}
