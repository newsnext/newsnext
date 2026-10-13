import type { ProviderConfig } from "../registry/types"
import { SOURCE_REGISTRY_LIMITS } from "../core/limits"

export type LocalFunctionKind = "load" | "request" | "annotation"
export interface LocalFunctionReference {
  $sourceFunction: string
  kind: LocalFunctionKind
}
export type LocalProviderValue = null | boolean | number | string | LocalProviderValue[] | { [key: string]: LocalProviderValue }
export interface LocalFunction {
  kind: LocalFunctionKind
  source?: string
  invoke: (...args: unknown[]) => unknown
}

function functionSlot(path: string[]): { kind: LocalFunctionKind, source?: string } | undefined {
  const [root, source, loader, slot] = path
  const key = root === "defaults" && path.length === 3 && source === "loader"
    ? loader
    : root === "sources" && path.length === 4 && loader === "loader" ? slot : undefined
  if (key !== "load" && key !== "request" && key !== "annotation") return undefined
  return { kind: key, ...(root === "sources" ? { source } : {}) }
}

/** Transport author definitions, not compiled Sources. Functions stay in the module host. */
export function serializeLocalProvider(value: unknown): { provider: LocalProviderValue, functions: Map<string, LocalFunction> } {
  const functions = new Map<string, LocalFunction>()
  const ancestors = new Set<object>()
  function visit(input: unknown, path: string[]): LocalProviderValue {
    if (path.length > 32) throw new TypeError("Local Provider nesting exceeds 32 levels")
    if (typeof input === "function") {
      const slot = functionSlot(path)
      if (!slot) throw new TypeError(`Unsupported Source function at ${path.join(".")}`)
      const id = JSON.stringify(path)
      functions.set(id, { ...slot, invoke: input as LocalFunction["invoke"] })
      return { $sourceFunction: id, kind: slot.kind }
    }
    if (input === null || typeof input === "string" || typeof input === "boolean") return input
    if (typeof input === "number" && Number.isFinite(input)) return input
    if (!input || typeof input !== "object" || ancestors.has(input)) throw new TypeError(`Non-serializable Source value at ${path.join(".")}`)
    ancestors.add(input)
    try {
      if (Array.isArray(input)) return input.map((item, index) => visit(item, [...path, String(index)]))
      if (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null) {
        throw new TypeError(`Non-serializable Source object at ${path.join(".")}`)
      }
      return Object.fromEntries(Object.entries(input).filter(([, child]) => child !== undefined).map(([key, child]) => {
        if (["__proto__", "constructor", "prototype", "$sourceFunction"].includes(key)) throw new TypeError(`Reserved Source key: ${key}`)
        return [key, visit(child, [...path, key])]
      }))
    } finally {
      ancestors.delete(input)
    }
  }
  const provider = visit(value, [])
  if (!provider || Array.isArray(provider) || typeof provider !== "object" || !provider.sources || Array.isArray(provider.sources) || typeof provider.sources !== "object") {
    throw new TypeError("Local Provider must define sources")
  }
  const count = Object.keys(provider.sources).length
  if (!count || count > SOURCE_REGISTRY_LIMITS.maxSources) throw new TypeError("Invalid local Provider Source count")
  if (new TextEncoder().encode(JSON.stringify(provider)).length > SOURCE_REGISTRY_LIMITS.maxBytes) throw new TypeError("Local Provider exceeds 2 MiB")
  return { provider, functions }
}

/** Restore only supported callbacks; the extension's regular resolver validates the definition. */
export function bindLocalProvider(value: unknown, bind: (reference: LocalFunctionReference, source?: string) => (...args: never[]) => unknown): ProviderConfig {
  function visit(input: unknown, path: string[]): unknown {
    if (path.length > 32) throw new TypeError("Local Provider nesting exceeds 32 levels")
    if (!input || typeof input !== "object") return input
    if (Array.isArray(input)) return input.map((child, index) => visit(child, [...path, String(index)]))
    if ("$sourceFunction" in input) {
      const slot = functionSlot(path)
      if (!slot || !("kind" in input) || input.kind !== slot.kind || input.$sourceFunction !== JSON.stringify(path) || Object.keys(input).length !== 2) {
        throw new TypeError(`Invalid Source function reference at ${path.join(".")}`)
      }
      return bind({ $sourceFunction: input.$sourceFunction, kind: slot.kind }, slot.source)
    }
    return Object.fromEntries(Object.entries(input).map(([key, child]) => {
      if (["__proto__", "constructor", "prototype"].includes(key)) throw new TypeError(`Reserved Source key: ${key}`)
      return [key, visit(child, [...path, key])]
    }))
  }
  return visit(value, []) as ProviderConfig
}
