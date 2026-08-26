import type { SyncStorage } from "jotai/vanilla/utils/atomWithStorage"
import { browser } from "#imports"

interface ExtensionStorageOptions<Value> {
  defaultValue: () => Value
  key: string
  normalize: (value: unknown) => Value
  onValue?: (value: Value) => void
  readOnly?: boolean
}

interface InitializableStorage<Value> extends SyncStorage<Value> {
  initialize: () => Promise<void>
}

export function createExtensionStorage<Value>(
  options: ExtensionStorageOptions<Value>,
): InitializableStorage<Value> {
  let value = options.normalize(options.defaultValue())

  function update(nextValue: unknown): Value {
    value = options.normalize(nextValue)
    options.onValue?.(value)
    return value
  }

  return {
    getItem: () => value,
    setItem: (_key, nextValue) => {
      const normalized = update(nextValue)
      if (!options.readOnly) {
        void browser.storage.local.set({ [options.key]: normalized }).catch(() => undefined)
      }
    },
    removeItem: () => {
      update(undefined)
      if (!options.readOnly) {
        void browser.storage.local.remove(options.key).catch(() => undefined)
      }
    },
    subscribe: (_key, callback) => {
      const handleStorageChange: Parameters<
        typeof browser.storage.onChanged.addListener
      >[0] = (changes, areaName): void => {
        const change = changes[options.key]
        if (areaName === "local" && change) {
          callback(update(change.newValue))
        }
      }

      browser.storage.onChanged.addListener(handleStorageChange)
      return () => browser.storage.onChanged.removeListener(handleStorageChange)
    },
    initialize: async () => {
      const stored = await browser.storage.local.get(options.key)
      const canonical = stored[options.key]
      if (canonical !== undefined) {
        const normalized = update(canonical)
        if (!options.readOnly && JSON.stringify(normalized) !== JSON.stringify(canonical)) {
          await browser.storage.local.set({ [options.key]: normalized })
        }
      }
    },
  }
}

export function createLocalStorage<Value>(
  options: ExtensionStorageOptions<Value>,
): SyncStorage<Value> {
  function read(serialized = localStorage.getItem(options.key)): Value {
    const value = options.normalize(parseJson(serialized))
    options.onValue?.(value)
    return value
  }

  return {
    getItem: () => read(),
    setItem: (_key, value) => {
      const normalized = options.normalize(value)
      localStorage.setItem(options.key, JSON.stringify(normalized))
      options.onValue?.(normalized)
    },
    removeItem: () => localStorage.removeItem(options.key),
    subscribe: (_key, callback) => {
      const handleStorage = (event: StorageEvent): void => {
        if (event.storageArea === localStorage && event.key === options.key) {
          callback(read(event.newValue))
        }
      }
      window.addEventListener("storage", handleStorage)
      return () => window.removeEventListener("storage", handleStorage)
    },
  }
}

function parseJson(value: string | null): unknown {
  if (value === null) return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}
