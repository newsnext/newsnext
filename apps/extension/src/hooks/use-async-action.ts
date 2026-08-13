import { useCallback, useRef, useState } from "react"

interface AsyncActionState {
  error: string | undefined
  isPending: boolean
  resetError: () => void
  run: (operation: () => Promise<void>, fallbackError?: string) => Promise<boolean>
}

interface KeyedAsyncActionState<Key> {
  error: string | undefined
  isPending: (key: Key) => boolean
  resetError: () => void
  run: (key: Key, operation: () => Promise<void>, fallbackError?: string) => Promise<boolean>
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function useAsyncAction(defaultError: string): AsyncActionState {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string>()
  const pendingRef = useRef(false)
  const resetError = useCallback(() => setError(undefined), [])

  const run = useCallback(async (
    operation: () => Promise<void>,
    fallbackError = defaultError,
  ): Promise<boolean> => {
    if (pendingRef.current) {
      return false
    }

    pendingRef.current = true
    setIsPending(true)
    setError(undefined)
    try {
      await operation()
      return true
    } catch (cause) {
      setError(getErrorMessage(cause, fallbackError))
      return false
    } finally {
      pendingRef.current = false
      setIsPending(false)
    }
  }, [defaultError])

  return { error, isPending, resetError, run }
}

export function useKeyedAsyncAction<Key>(defaultError: string): KeyedAsyncActionState<Key> {
  const [pendingKeys, setPendingKeys] = useState<Set<Key>>(() => new Set())
  const [error, setError] = useState<string>()
  const pendingKeysRef = useRef(new Set<Key>())
  const resetError = useCallback(() => setError(undefined), [])

  const run = useCallback(async (
    key: Key,
    operation: () => Promise<void>,
    fallbackError = defaultError,
  ): Promise<boolean> => {
    if (pendingKeysRef.current.has(key)) {
      return false
    }

    pendingKeysRef.current.add(key)
    setPendingKeys(current => new Set(current).add(key))
    setError(undefined)
    try {
      await operation()
      return true
    } catch (cause) {
      setError(getErrorMessage(cause, fallbackError))
      return false
    } finally {
      pendingKeysRef.current.delete(key)
      setPendingKeys((current) => {
        const next = new Set(current)
        next.delete(key)
        return next
      })
    }
  }, [defaultError])

  const isPending = useCallback((key: Key): boolean => pendingKeys.has(key), [pendingKeys])
  return { error, isPending, resetError, run }
}
