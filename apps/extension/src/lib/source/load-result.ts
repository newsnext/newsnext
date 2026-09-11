import type { SourceLoadResponse } from "@newsnext/sdk/models"

export type { LoadedSourceDescriptor, SourceLoadResponse, SourceLoadResult } from "@newsnext/sdk/models"

export function isSourceLoadResponse(value: unknown): value is SourceLoadResponse {
  return isRecord(value)
    && typeof value.fetchProtected === "boolean"
    && typeof value.fetchedAt === "number"
    && typeof value.loadedAt === "number"
    && isRecord(value.params)
    && isRecord(value.result)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
