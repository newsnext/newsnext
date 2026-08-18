import type {
  ExtensionConnectionProviderRunRequest,
  ExtensionConnectionRegisteredRunRequest,
} from "@newsnext/extension-connection"
import type { ProviderConfig } from "@newsnext/source-kit/registry"
import type { SourceLoaderResult } from "@newsnext/source-kit/types"
import type { BackgroundSourceFetchResult } from "./source-fetch"
import {
  flattenProviderConfig,
  resolveSourceRegistry,
} from "@newsnext/source-kit/registry"
import { normalizeSourceParams, parseSourceId } from "@newsnext/source-kit/runtime"
import { createBackgroundSourceFetch } from "./source-fetch"
import { resolveSourceSecrets, updateSourceSecrets } from "./source-secrets"
import { createBackgroundSourceService } from "./source-service"

export type RunConnectedSourceInput
  = | Omit<ExtensionConnectionRegisteredRunRequest, "id" | "type">
    | Omit<ExtensionConnectionProviderRunRequest, "id" | "type">

export interface RunConnectedSourceOutput extends Omit<SourceLoaderResult, "items"> {
  data: SourceLoaderResult["items"]
  execution: {
    durationMs: number
    observedAt: number
    params: Record<string, unknown>
    providerId: string
    sourceId: string
    sourceVersion: number
  }
  fetches: BackgroundSourceFetchResult[]
}

function assertIdSegment(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || !value || /[:\s]/.test(value)) {
    throw new Error(`${name} must be a non-empty source ID segment`)
  }
}

export function getConnectedSourceSecretProviderId(
  providerId: string,
  useProviderSecrets = false,
): string {
  return useProviderSecrets ? providerId : `cli:${providerId}`
}

function createRunOutput(
  result: SourceLoaderResult,
  providerId: string,
  sourceId: string,
  sourceVersion: number,
  params: Record<string, unknown>,
  fetches: BackgroundSourceFetchResult[],
  startedAt: number,
): RunConnectedSourceOutput {
  return {
    data: result.items,
    execution: {
      durationMs: Math.round(performance.now() - startedAt),
      observedAt: Date.now(),
      params,
      providerId,
      sourceId,
      sourceVersion,
    },
    fetches,
    itemTemplate: result.itemTemplate,
    metadata: result.metadata,
  }
}

export async function runConnectedSource(
  input: RunConnectedSourceInput,
): Promise<RunConnectedSourceOutput> {
  const startedAt = performance.now()
  const fetches: BackgroundSourceFetchResult[] = []

  if (input.providerId === undefined) {
    let params: Record<string, unknown> = {}
    let sourceVersion = 0
    const result = await createBackgroundSourceService({
      fetchResults: fetches,
      onRequestPrepared(preparedParams, preparedSourceVersion) {
        params = preparedParams
        sourceVersion = preparedSourceVersion
      },
    }).load({
      sourceId: input.sourceId,
      params: input.params,
    })
    return createRunOutput(
      result,
      parseSourceId(input.sourceId).provider,
      input.sourceId,
      sourceVersion,
      params,
      fetches,
      startedAt,
    )
  }

  assertIdSegment(input.providerId, "providerId")
  assertIdSegment(input.sourceId, "sourceId")

  const registry = flattenProviderConfig(
    input.providerId,
    input.provider as ProviderConfig,
  )
  const sourceId = `${input.providerId}:${input.sourceId}`
  const source = resolveSourceRegistry(registry)[sourceId]
  if (!source) {
    throw new Error(`Source "${sourceId}" not found`)
  }

  const params = normalizeSourceParams(source, input.params ?? {})
  const secretProviderId = getConnectedSourceSecretProviderId(
    input.providerId,
    input.useProviderSecrets,
  )
  const secrets = await resolveSourceSecrets(source, secretProviderId)
  const signal = new AbortController().signal
  const result = await source.loader(params, {
    fetch: createBackgroundSourceFetch(
      sourceId,
      source.capabilities.network,
      signal,
      fetches,
    ),
    secrets,
    signal,
    updateSecrets: async (updates) => {
      Object.assign(secrets, updates)
      await updateSourceSecrets(source, secretProviderId, updates)
    },
  })

  return createRunOutput(
    result,
    input.providerId,
    sourceId,
    source.cache.version,
    params,
    fetches,
    startedAt,
  )
}
