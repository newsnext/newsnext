import type { InstanceMetadata } from "@/lib/source"
import type { LiveCardViewModel } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { useEffect, useState } from "react"
import { useAsyncAction } from "@/hooks/use-async-action"
import { useI18n } from "@/hooks/use-i18n"
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
  onSaveSourceMeta: (meta: InstanceMetadata) => Promise<void> | void
  onPreviewMetadataChange?: (meta: InstanceMetadata | null) => void
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
  const { t } = useI18n()
  const { params, provider } = source
  const { badge, desc, home, title } = source.metadata
  const [editDraft, setEditDraft] = useState<InstanceMetadata | null>(null)
  const [isEditingParams, setIsEditingParams] = useState(false)
  const { error: saveError, isPending: isSaving, run: runSave } = useAsyncAction(
    t("saveLiveCardFailed"),
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

  function updateEditDraft(patch: Partial<InstanceMetadata>): void {
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
          <span className="inline-block border-b border-border/60 pb-1 font-semibold opacity-80">{t("metadata")}</span>
          {isEditingMetadata
            ? (
                <div className="flex gap-1.5">
                  <Button type="button" variant="outline" tone="theme" size="sm" disabled={isSaving} className="h-6 px-2" onClick={() => setEditDraft(null)}>
                    {t("cancel")}
                  </Button>
                  <Button type="button" size="sm" tone="theme" disabled={!hasSourceMetaChanges || isSaving} className="h-6 px-2" onClick={() => void saveEditDraft()}>
                    {t("save")}
                  </Button>
                </div>
              )
            : (
                <Button type="button" size="sm" tone="theme" title={t("editMetadata")} className="h-6 px-2" onClick={() => setEditDraft({})}>
                  {t("edit")}
                </Button>
              )}
        </div>
        <Info label={t("title")}>
          <EditableInput text={previewTitle || ""} editable={isEditingMetadata} onChange={value => updateEditDraft({ title: value })} />
        </Info>
        <Info label={t("description")}>
          <EditableInput text={previewDesc || ""} editable={isEditingMetadata} onChange={value => updateEditDraft({ desc: value })} />
        </Info>
        <Info label={t("home")}>
          <EditableInput text={previewHome || ""} editable={isEditingMetadata} onChange={value => updateEditDraft({ home: value })} />
        </Info>
        <Info label={t("badge")}>
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
            <span className="inline-block border-b border-border/60 pb-1 font-semibold opacity-80">{t("parameters")}</span>
            {isEditingParams
              ? (
                  <div className="flex gap-1.5">
                    <Button type="button" variant="outline" tone="theme" size="sm" disabled={isSaving} className="h-6 px-2" onClick={cancelEditingParams}>
                      {t("cancel")}
                    </Button>
                    <Button type="button" variant="outline" tone="theme" size="sm" disabled={!hasSourceParams || isSaving} className="h-6 px-2" onClick={() => void resetParams()}>
                      {t("reset")}
                    </Button>
                    <Button type="button" size="sm" tone="theme" disabled={!hasSourceParamChanges || !sourceParamValidation.valid || isSaving} className="h-6 px-2" onClick={() => void saveParams()}>
                      {t("save")}
                    </Button>
                  </div>
                )
              : (
                  <Button type="button" size="sm" tone="theme" title={t("editParameters")} className="h-6 px-2" onClick={startEditingParams}>
                    {t("edit")}
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
          <span className="inline-block border-b border-border/60 pb-1 font-semibold opacity-80">{t("permissions")}</span>
        </div>
        {permissionRequest
          ? <SourcePermissionDetails cookieOrigins={cookieOrigins} request={permissionRequest} />
          : <p className="text-muted-foreground">{t("noAdditionalPermissions")}</p>}
      </section>
      {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
    </div>
  )
}
