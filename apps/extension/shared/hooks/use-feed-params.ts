import type { FeedParamSchema } from "@newsnext/feeds/typings"
import type { FeedParamValues } from "@/lib/feed-params"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getDefaultFeedParamValues,
  getFeedParamsStorageKey,
  readStoredFeedParamValues,
  sanitizeFeedParamValues,
  writeStoredFeedParamValues,
} from "@/lib/feed-params"

export interface UseFeedParamsOptions {
  storageId: string
  params?: Record<string, FeedParamSchema>
  initialValues?: FeedParamValues
}

export function useFeedParams({ storageId, params, initialValues }: UseFeedParamsOptions) {
  const storageKey = useMemo(() => getFeedParamsStorageKey(storageId), [storageId])
  const [savedParams, setSavedParams] = useState<FeedParamValues>(() => {
    if (typeof window === "undefined") {
      return sanitizeFeedParamValues(initialValues, params)
    }

    return sanitizeFeedParamValues(readStoredFeedParamValues(storageId) ?? initialValues, params)
  })
  const [draftParams, setDraftParams] = useState<FeedParamValues>(savedParams)

  useEffect(() => {
    const nextSavedParams = sanitizeFeedParamValues(readStoredFeedParamValues(storageId) ?? initialValues, params)
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
    const nextParams = sanitizeFeedParamValues(draftParams, params)
    setSavedParams(nextParams)
    setDraftParams(nextParams)
    writeStoredFeedParamValues(storageId, nextParams)
    return nextParams
  }, [draftParams, params, storageId])

  const resetDraftParams = useCallback(() => {
    const defaults = getDefaultFeedParamValues(params)
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
