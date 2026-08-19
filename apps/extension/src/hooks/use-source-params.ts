import type { SourceParamSchema } from "@newsnext/source-kit/types"
import type { SourceParamValues } from "@/lib/source"
import { validateSourceParamPatch } from "@newsnext/source-kit/core"
import { useCallback, useState } from "react"
import { sanitizeSourceParamPatch } from "@/lib/source"

export interface UseSourceParamsOptions {
  params?: Record<string, SourceParamSchema>
  initialValues?: SourceParamValues
}

interface SourceParamsState {
  initialValues?: SourceParamValues
  params?: Record<string, SourceParamSchema>
  savedParams: SourceParamValues
  draftParams: SourceParamValues
}

function createSourceParamsState(
  params?: Record<string, SourceParamSchema>,
  initialValues?: SourceParamValues,
): SourceParamsState {
  const savedParams = sanitizeSourceParamPatch(initialValues, params)
  return {
    initialValues,
    params,
    savedParams,
    draftParams: savedParams,
  }
}

export function useSourceParams({ params, initialValues }: UseSourceParamsOptions) {
  const [storedState, setStoredState] = useState<SourceParamsState>(() => (
    createSourceParamsState(params, initialValues)
  ))
  let state = storedState

  if (storedState.params !== params || storedState.initialValues !== initialValues) {
    state = createSourceParamsState(params, initialValues)
    setStoredState(state)
  }

  const updateDraftParam = useCallback((key: string, value: unknown) => {
    setStoredState(prev => ({
      ...prev,
      draftParams: {
        ...prev.draftParams,
        [key]: value,
      },
    }))
  }, [])

  const validation = validateSourceParamPatch(params, state.draftParams)
  const getDraftParams = useCallback(() => {
    const result = validateSourceParamPatch(params, state.draftParams)
    if (!result.valid) {
      throw new Error(Object.values(result.errors)[0] ?? "Invalid source parameters")
    }
    return result.values
  }, [params, state.draftParams])

  const commitParams = useCallback((nextParams: SourceParamValues) => {
    setStoredState(prev => ({
      ...prev,
      savedParams: nextParams,
      draftParams: nextParams,
    }))
  }, [])

  const discardDraftParams = useCallback(() => {
    setStoredState(prev => ({
      ...prev,
      draftParams: prev.savedParams,
    }))
  }, [])

  const hasParams = Boolean(params && Object.keys(params).length > 0)
  const isDirty = JSON.stringify(state.savedParams) !== JSON.stringify(state.draftParams)

  return {
    hasParams,
    savedParams: state.savedParams,
    draftParams: state.draftParams,
    validation,
    isDirty,
    updateDraftParam,
    getDraftParams,
    commitParams,
    discardDraftParams,
  }
}
