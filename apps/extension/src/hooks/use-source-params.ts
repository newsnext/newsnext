import type { SourceParamSchema } from "@newsnext/client-source/typings"
import type { SourceParamValues } from "@/lib/source-params"
import { useCallback, useEffect, useState } from "react"
import {
  getDefaultSourceParamValues,
  sanitizeSourceParamValues,
} from "@/lib/source-params"

export interface UseSourceParamsOptions {
  params?: Record<string, SourceParamSchema>
  initialValues?: SourceParamValues
}

export function useSourceParams({ params, initialValues }: UseSourceParamsOptions) {
  const [savedParams, setSavedParams] = useState<SourceParamValues>(() => {
    return sanitizeSourceParamValues(initialValues, params)
  })
  const [draftParams, setDraftParams] = useState<SourceParamValues>(savedParams)

  useEffect(() => {
    const nextSavedParams = sanitizeSourceParamValues(initialValues, params)
    setSavedParams(nextSavedParams)
    setDraftParams(nextSavedParams)
  }, [params, initialValues])

  const updateDraftParam = useCallback((key: string, value: unknown) => {
    setDraftParams(prev => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const saveDraftParams = useCallback(() => {
    const nextParams = sanitizeSourceParamValues(draftParams, params)
    setSavedParams(nextParams)
    setDraftParams(nextParams)
    return nextParams
  }, [draftParams, params])

  const resetDraftParams = useCallback(() => {
    const defaults = getDefaultSourceParamValues(params)
    setSavedParams(defaults)
    setDraftParams(defaults)
  }, [params])

  const discardDraftParams = useCallback(() => {
    setDraftParams(savedParams)
  }, [savedParams])

  const hasParams = Boolean(params && Object.keys(params).length > 0)
  const isDirty = JSON.stringify(savedParams) !== JSON.stringify(draftParams)

  return {
    hasParams,
    savedParams,
    draftParams,
    isDirty,
    updateDraftParam,
    saveDraftParams,
    resetDraftParams,
    discardDraftParams,
  }
}
