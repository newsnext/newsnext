import { useCallback } from "react"

interface LocalStorageCacheHandlers<T> {
  readCache: () => T | undefined
  writeCache: (value: T) => void
}

export function useLocalStorageCache<T>(storageKey: string): LocalStorageCacheHandlers<T> {
  const readCache = useCallback((): T | undefined => {
    const cached = window.localStorage.getItem(storageKey)
    if (!cached) {
      return undefined
    }

    try {
      return JSON.parse(cached) as T
    } catch {
      window.localStorage.removeItem(storageKey)
      return undefined
    }
  }, [storageKey])

  const writeCache = useCallback(
    (value: T) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(value))
      } catch {
        // Silently ignore write errors to avoid breaking UI
      }
    },
    [storageKey],
  )

  return {
    readCache,
    writeCache,
  }
}
