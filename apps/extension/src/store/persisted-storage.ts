import type { SyncStorage } from "jotai/vanilla/utils/atomWithStorage"
import { browser } from "#imports"

interface MirroredStorageOptions<Value> {
  defaultValue: () => Value
  key: string
  normalize: (value: unknown) => Value
}

export function createMirroredStorage<Value>(
  options: MirroredStorageOptions<Value>,
): SyncStorage<Value> {
  return {
    getItem: () => readCachedValue(options),
    setItem: (_key, value) => {
      const normalized = options.normalize(value)
      writeCachedValue(options, normalized)
      void browser.storage.local.set({ [options.key]: normalized }).catch(() => undefined)
    },
    removeItem: () => {
      localStorage.removeItem(options.key)
      void browser.storage.local.remove(options.key).catch(() => undefined)
    },
    subscribe: (_key, callback) => {
      let active = true
      const initialValue = readCachedValue(options)
      const initialSerialized = serializeValue(initialValue)
      const handleStorageChange: Parameters<
        typeof browser.storage.onChanged.addListener
      >[0] = (changes, areaName): void => {
        const change = changes[options.key]
        if (areaName !== "local" || !change) {
          return
        }

        const value = options.normalize(change.newValue)
        if (localStorage.getItem(options.key) === serializeValue(value)) {
          return
        }
        writeCachedValue(options, value)
        callback(value)
      }

      browser.storage.onChanged.addListener(handleStorageChange)
      void reconcileValue(options).then((value) => {
        if (active && serializeValue(value) !== initialSerialized) {
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
    if (JSON.stringify(value) !== JSON.stringify(canonical)) {
      await browser.storage.local.set({ [options.key]: value })
    }
    return value
  }

  const value = readCachedValue(options)
  await browser.storage.local.set({ [options.key]: value })
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
