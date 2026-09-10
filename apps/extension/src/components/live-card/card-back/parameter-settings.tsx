import type { SourceParamSchemaMap } from "@newsnext/source-kit/types"
import { useState } from "react"
import { useI18n } from "@/hooks/use-i18n"
import { ParamField } from "./param-field"
import { CardSettingsSection } from "./settings-section"

export interface SourceParamValidationState {
  errors: Record<string, string | undefined>
  valid: boolean
}

export interface ParameterSettingsProps {
  params?: SourceParamSchemaMap
  draftSourceParams: Record<string, unknown>
  hasSourceParams: boolean
  hasSourceParamChanges: boolean
  sourceParamValidation: SourceParamValidationState
  onSourceParamChange: (key: string, value: unknown) => void
  onSaveSourceParams: () => Promise<void> | void
  onResetSourceParams: () => Promise<void> | void
  onDiscardSourceParams: () => void
}

export function ParameterSettings({
  params,
  draftSourceParams,
  hasSourceParams,
  hasSourceParamChanges,
  sourceParamValidation,
  onSourceParamChange,
  onSaveSourceParams,
  onResetSourceParams,
  onDiscardSourceParams,
}: ParameterSettingsProps): React.JSX.Element | null {
  const { t } = useI18n()
  const [isEditingParams, setIsEditingParams] = useState(false)

  function startEditingParams(): void {
    onDiscardSourceParams()
    setIsEditingParams(true)
  }

  function cancelEditingParams(): void {
    onDiscardSourceParams()
    setIsEditingParams(false)
  }

  async function saveParams(): Promise<void> {
    await onSaveSourceParams()
    setIsEditingParams(false)
  }

  async function resetParams(): Promise<void> {
    await onResetSourceParams()
    setIsEditingParams(false)
  }

  if (!hasSourceParams) return null

  return (
    <CardSettingsSection
      title={t("parameters")}
      editLabel={t("editParameters")}
      editing={isEditingParams}
      dirty={hasSourceParamChanges}
      valid={sourceParamValidation.valid}
      errorMessage={t("saveParametersFailed")}
      onEdit={startEditingParams}
      onCancel={cancelEditingParams}
      onSave={saveParams}
      onReset={resetParams}
    >
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
    </CardSettingsSection>
  )
}
