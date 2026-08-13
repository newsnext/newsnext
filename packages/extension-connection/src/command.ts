import type { ExtensionConnectionCommandRequest } from "./types"

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isOptionalFiniteNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isFinite(value))
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string"
}

export function isStringPair(value: unknown): value is [string, string] {
  return Array.isArray(value)
    && value.length === 2
    && value.every(item => typeof item === "string")
}

export function isExtensionFetchUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
  } catch {
    return false
  }
}

export function isExtensionFetchMethod(value: string): boolean {
  const method = value.toUpperCase()
  return /^[!#$%&'*+.^_`|~0-9A-Z-]+$/.test(method)
    && !["CONNECT", "TRACE", "TRACK"].includes(method)
}

export function parseExtensionConnectionCommandRequest(
  value: unknown,
): ExtensionConnectionCommandRequest {
  if (!isRecord(value) || typeof value.id !== "string") {
    throw new Error("Invalid extension command")
  }
  if (value.type === "app.open") {
    return { id: value.id, type: "app.open" }
  }
  if (value.type === "application.action.list") {
    return { id: value.id, type: "application.action.list" }
  }
  if (
    value.type === "application.action.execute"
    && typeof value.name === "string"
    && value.name.length > 0
    && isRecord(value.input)
  ) {
    return {
      id: value.id,
      type: "application.action.execute",
      name: value.name,
      input: value.input,
    }
  }
  if (value.type === "application.query.list") {
    return { id: value.id, type: "application.query.list" }
  }
  if (
    value.type === "application.query.execute"
    && typeof value.name === "string"
    && value.name.length > 0
    && isRecord(value.input)
  ) {
    return {
      id: value.id,
      type: "application.query.execute",
      name: value.name,
      input: value.input,
    }
  }
  if (
    value.type === "fetch"
    && typeof value.url === "string"
    && isExtensionFetchUrl(value.url)
    && typeof value.method === "string"
    && isExtensionFetchMethod(value.method)
    && Array.isArray(value.headers)
    && value.headers.every(isStringPair)
    && isOptionalString(value.body)
    && (value.body === undefined || !["GET", "HEAD"].includes(value.method.toUpperCase()))
    && typeof value.timeoutMs === "number"
    && Number.isFinite(value.timeoutMs)
    && value.timeoutMs > 0
  ) {
    return {
      id: value.id,
      type: "fetch",
      url: value.url,
      method: value.method,
      headers: value.headers,
      timeoutMs: value.timeoutMs,
      body: value.body,
    }
  }
  if (
    value.type === "source.run"
    && typeof value.sourceId === "string"
    && (value.params === undefined || isRecord(value.params))
  ) {
    if (value.providerId === undefined && value.provider === undefined) {
      return {
        id: value.id,
        type: "source.run",
        sourceId: value.sourceId,
        params: value.params,
      }
    }
    if (typeof value.providerId === "string" && isRecord(value.provider)) {
      return {
        id: value.id,
        type: "source.run",
        providerId: value.providerId,
        sourceId: value.sourceId,
        provider: value.provider,
        params: value.params,
        useProviderSecrets: value.useProviderSecrets === true,
      }
    }
  }
  if (
    value.type === "source-history.datasets"
    && isOptionalString(value.cursor)
    && isOptionalFiniteNumber(value.limit)
    && isOptionalString(value.providerId)
    && isOptionalString(value.sourceId)
  ) {
    return {
      id: value.id,
      type: "source-history.datasets",
      cursor: value.cursor,
      limit: value.limit,
      providerId: value.providerId,
      sourceId: value.sourceId,
    }
  }
  if (
    value.type === "source-history.observations"
    && typeof value.instanceId === "string"
    && isOptionalFiniteNumber(value.cursor)
    && isOptionalFiniteNumber(value.from)
    && isOptionalFiniteNumber(value.limit)
    && isOptionalFiniteNumber(value.to)
  ) {
    return {
      id: value.id,
      type: "source-history.observations",
      instanceId: value.instanceId,
      cursor: value.cursor,
      from: value.from,
      limit: value.limit,
      to: value.to,
    }
  }
  if (
    value.type === "source-history.get"
    && typeof value.instanceId === "string"
    && typeof value.observedAt === "number"
    && Number.isFinite(value.observedAt)
  ) {
    return {
      id: value.id,
      type: "source-history.get",
      instanceId: value.instanceId,
      observedAt: value.observedAt,
    }
  }
  if (
    value.type === "source-history.compare"
    && typeof value.instanceId === "string"
    && typeof value.before === "number"
    && Number.isFinite(value.before)
    && typeof value.after === "number"
    && Number.isFinite(value.after)
  ) {
    return {
      id: value.id,
      type: "source-history.compare",
      instanceId: value.instanceId,
      before: value.before,
      after: value.after,
    }
  }
  throw new Error("Invalid extension command")
}
