import type { SourceLoaderResult, SourceLoadResponse, SourceLoadResult } from "@newsnext/sdk/models"
import type { RuntimeSource } from "@newsnext/source-kit/types"

export type { LoadedSourceDescriptor, SourceLoadResponse, SourceLoadResult } from "@newsnext/sdk/models"

export function toSourceLoadResult(
  source: Pick<RuntimeSource, "capabilities" | "metadata" | "params" | "provider" | "version">,
  sourceId: string,
  result: SourceLoaderResult,
): SourceLoadResult {
  return {
    ...result,
    source: {
      capabilities: source.capabilities,
      id: sourceId,
      metadata: source.metadata,
      params: source.params,
      provider: source.provider,
      version: source.version,
    },
  }
}

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
