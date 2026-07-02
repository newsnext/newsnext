import type { SourceParamSchema } from "@newsnext/client-source/typings"
import type { SourceParamValues } from "@/lib/source-params"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getDefaultSourceParamValues,
  getSourceParamsStorageKey,
  readStoredSourceParamValues,
  sanitizeSourceParamValues,
  writeStoredSourceParamValues,
} from "@/lib/source-params"

export interface UseSourceParamsOptions {
  storageId: string
  params?: Record<string, SourceParamSchema>
  initialValues?: SourceParamValues
}

export function useSourceParams({ storageId, params, initialValues }: UseSourceParamsOptions) {
  const storageKey = useMemo(() => getSourceParamsStorageKey(storageId), [storageId])
  const [savedParams, setSavedParams] = useState<SourceParamValues>(() => {
    if (typeof window === "undefined") {
      return sanitizeSourceParamValues(initialValues, params)
    }

    return sanitizeSourceParamValues(readStoredSourceParamValues(storageId) ?? initialValues, params)
  })
  const [draftParams, setDraftParams] = useState<SourceParamValues>(savedParams)

  useEffect(() => {
    const nextSavedParams = sanitizeSourceParamValues(readStoredSourceParamValues(storageId) ?? initialValues, params)
    setSavedParams(nextSavedParams)
    setDraftParams(nextSavedParams)
  }, [storageId, storageKey, params, initialValues])

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
    writeStoredSourceParamValues(storageId, nextParams)
    return nextParams
  }, [draftParams, params, storageId])

  const resetDraftParams = useCallback(() => {
    const defaults = getDefaultSourceParamValues(params)
    setSavedParams(defaults)
    setDraftParams(defaults)
    window.localStorage.removeItem(storageKey)
  }, [params, storageKey])

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
