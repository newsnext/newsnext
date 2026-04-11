import type { FeedParamSchema } from "@newsnext/feeds/typings"
import { useCallback, useEffect, useMemo, useState } from "react"

const FEED_PARAMS_STORAGE_PREFIX = "newsnext-feed-params"

export type FeedParamValues = Record<string, unknown>

function getDefaultParamValues(params?: Record<string, FeedParamSchema>): FeedParamValues {
  if (!params) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(params).map(([key, param]) => [key, param.default]),
  )
}

function sanitizeParamValues(
  values: FeedParamValues | undefined,
  params?: Record<string, FeedParamSchema>,
): FeedParamValues {
  const defaults = getDefaultParamValues(params)

  if (!params) {
    return {}
  }

  if (!values) {
    return defaults
  }

  return Object.fromEntries(
    Object.keys(params).map(key => [key, values[key] ?? defaults[key]]),
  )
}

function readStoredParamValues(storageKey: string): FeedParamValues | undefined {
  const stored = window.localStorage.getItem(storageKey)
  if (!stored) {
    return undefined
  }

  try {
    return JSON.parse(stored) as FeedParamValues
  } catch {
    window.localStorage.removeItem(storageKey)
    return undefined
  }
}

export interface UseFeedParamsOptions {
  feedId: string
  params?: Record<string, FeedParamSchema>
}

export function useFeedParams({ feedId, params }: UseFeedParamsOptions) {
  const storageKey = useMemo(() => `${FEED_PARAMS_STORAGE_PREFIX}/${feedId}`, [feedId])
  const [savedParams, setSavedParams] = useState<FeedParamValues>(() => {
    if (typeof window === "undefined") {
      return getDefaultParamValues(params)
    }

    return sanitizeParamValues(readStoredParamValues(`${FEED_PARAMS_STORAGE_PREFIX}/${feedId}`), params)
  })
  const [draftParams, setDraftParams] = useState<FeedParamValues>(savedParams)

  useEffect(() => {
    const nextSavedParams = sanitizeParamValues(readStoredParamValues(storageKey), params)
    setSavedParams(nextSavedParams)
    setDraftParams(nextSavedParams)
  }, [storageKey, params])

  const updateDraftParam = useCallback((key: string, value: unknown) => {
    setDraftParams(prev => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const saveDraftParams = useCallback(() => {
    const nextParams = sanitizeParamValues(draftParams, params)
    setSavedParams(nextParams)
    setDraftParams(nextParams)
    window.localStorage.setItem(storageKey, JSON.stringify(nextParams))
  }, [draftParams, params, storageKey])

  const resetDraftParams = useCallback(() => {
    const defaults = getDefaultParamValues(params)
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
