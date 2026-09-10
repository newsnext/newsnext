import type { ParameterSettingsProps } from "./parameter-settings"
import type { InstanceMetadata } from "@/lib/source"
import type { LiveCardViewModel } from "@/typings/source"
import { useI18n } from "@/hooks/use-i18n"
import { getHostPermissionOrigins, getPermissionRequestForSource } from "@/lib/source"
import { SourcePermissionDetails } from "../source-permission-details"
import { CardMetadataSettings } from "./metadata-settings"
import { ParameterSettings } from "./parameter-settings"

export interface LiveCardEditFormProps extends Omit<ParameterSettingsProps, "params"> {
  source: LiveCardViewModel
  onResetSourceMeta?: () => Promise<void> | void
  onSaveSourceMeta: (meta: InstanceMetadata) => Promise<void> | void
  onPreviewMetadataChange?: (meta: InstanceMetadata | null) => void
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
  onResetSourceMeta,
  onPreviewMetadataChange,
}: LiveCardEditFormProps): React.JSX.Element {
  const { t } = useI18n()
  const { params, provider } = source
  const permissionRequest = getPermissionRequestForSource(source, draftSourceParams)
  const cookieOrigins = getHostPermissionOrigins({
    cookies: source.capabilities.cookies,
    network: [],
  })

  return (
    <div className="space-y-4">
      <CardMetadataSettings
        metadata={{ ...source.metadata, title: source.metadata.title || provider.title, color: source.metadata.color ?? provider.color }}
        onSave={onSaveSourceMeta}
        onReset={onResetSourceMeta}
        onPreviewMetadataChange={onPreviewMetadataChange}
      />

      <ParameterSettings
        params={params}
        draftSourceParams={draftSourceParams}
        hasSourceParams={hasSourceParams}
        hasSourceParamChanges={hasSourceParamChanges}
        sourceParamValidation={sourceParamValidation}
        onSourceParamChange={onSourceParamChange}
        onSaveSourceParams={onSaveSourceParams}
        onResetSourceParams={onResetSourceParams}
        onDiscardSourceParams={onDiscardSourceParams}
      />
      <section className="flex flex-col pt-0.5 text-sm">
        <div className="mb-2 flex items-start justify-between">
          <span className="inline-block border-b border-border/60 pb-1 font-semibold opacity-80">{t("permissions")}</span>
        </div>
        {permissionRequest
          ? <SourcePermissionDetails cookieOrigins={cookieOrigins} request={permissionRequest} />
          : <p className="text-muted-foreground">{t("noAdditionalPermissions")}</p>}
      </section>
    </div>
  )
}
