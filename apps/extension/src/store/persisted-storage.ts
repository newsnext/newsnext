import type { SyncStorage } from "jotai/vanilla/utils/atomWithStorage"
import { browser } from "#imports"

interface MirroredStorageOptions<Value> {
  defaultValue: () => Value
  key: string
  normalize: (value: unknown) => Value
  readOnly?: boolean
}

export function createMirroredStorage<Value>(
  options: MirroredStorageOptions<Value>,
): SyncStorage<Value> {
  let lastKnownSerialized: string | undefined

  function cacheValue(value: Value): void {
    lastKnownSerialized = serializeValue(value)
    writeCachedValue(options, value)
  }

  function readValue(): Value {
    const value = readCachedValue(options)
    lastKnownSerialized = serializeValue(value)
    return value
  }

  return {
    getItem: readValue,
    setItem: (_key, value) => {
      const normalized = options.normalize(value)
      cacheValue(normalized)
      if (!options.readOnly) {
        void browser.storage.local.set({ [options.key]: normalized }).catch(() => undefined)
      }
    },
    removeItem: () => {
      lastKnownSerialized = undefined
      localStorage.removeItem(options.key)
      if (!options.readOnly) {
        void browser.storage.local.remove(options.key).catch(() => undefined)
      }
    },
    subscribe: (_key, callback) => {
      let active = true
      readValue()
      const handleStorageChange: Parameters<
        typeof browser.storage.onChanged.addListener
      >[0] = (changes, areaName): void => {
        const change = changes[options.key]
        if (areaName !== "local" || !change) {
          return
        }

        const value = options.normalize(change.newValue)
        const serialized = serializeValue(value)
        if (lastKnownSerialized === serialized) {
          return
        }
        cacheValue(value)
        callback(value)
      }

      browser.storage.onChanged.addListener(handleStorageChange)
      void reconcileValue(options).then((value) => {
        const serialized = serializeValue(value)
        if (active && serialized !== lastKnownSerialized) {
          cacheValue(value)
          callback(value)
        }
      }).catch(() => undefined)

      return () => {
        active = false
        browser.storage.onChanged.removeListener(handleStorageChange)
      }
    },
  }
}

export function readCachedValue<Value>(
  options: MirroredStorageOptions<Value>,
): Value {
  const stored = parseJson(localStorage.getItem(options.key))
  const cached = stored === undefined
    ? options.normalize(options.defaultValue())
    : options.normalize(stored)
  writeCachedValue(options, cached)
  return cached
}

function writeCachedValue<Value>(
  options: MirroredStorageOptions<Value>,
  value: Value,
): void {
  const serialized = serializeValue(value)
  if (localStorage.getItem(options.key) !== serialized) {
    localStorage.setItem(options.key, serialized)
  }
}

function serializeValue<Value>(value: Value): string {
  return JSON.stringify(value)
}

async function reconcileValue<Value>(
  options: MirroredStorageOptions<Value>,
): Promise<Value> {
  const stored = await browser.storage.local.get(options.key)
  const canonical = stored[options.key]
  if (canonical !== undefined) {
    const value = options.normalize(canonical)
    writeCachedValue(options, value)
    if (!options.readOnly && JSON.stringify(value) !== JSON.stringify(canonical)) {
      await browser.storage.local.set({ [options.key]: value })
    }
    return value
  }

  const value = readCachedValue(options)
  if (!options.readOnly) {
    await browser.storage.local.set({ [options.key]: value })
  }
  return value
}

function parseJson(value: string | null): unknown {
  if (value === null) {
    return undefined
  }
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}
