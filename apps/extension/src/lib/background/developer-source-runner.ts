import type { ProviderConfig } from "@newsnext/source-kit/registry"
import type { SourceLoaderResult } from "@newsnext/source-kit/types"
import type { SourcePermissionTarget } from "../source/permissions"
import type { BackgroundSourceFetchResult } from "./source-fetch"
import {
  flattenProviderConfig,
  resolveSourceRegistry,
} from "@newsnext/source-kit/registry"
import { normalizeSourceParams, parseSourceId, prepareSourceRequest } from "@newsnext/source-kit/runtime"
import { createBackgroundSourceFetch } from "./source-fetch"
import { createSourceLoaderInvoker } from "./source-loader-invoker"
import { resolveSourceSecrets, updateSourceSecrets } from "./source-secrets"

interface RunDeveloperSourceOptions {
  debug: boolean
  params?: Record<string, unknown>
  sourceId: string
}

export type RunDeveloperSourceInput = RunDeveloperSourceOptions & (
  | {
    provider?: never
    providerId?: never
    useProviderSecrets?: never
  }
  | {
    provider: unknown
    providerId: string
    useProviderSecrets?: boolean
  }
)

export interface RunDeveloperSourceOutput extends Omit<SourceLoaderResult, "items"> {
  data: SourceLoaderResult["items"]
  execution: {
    durationMs: number
    loadedAt: number
    params: Record<string, unknown>
    providerId: string
    sourceId: string
    sourceVersion: number
  }
  fetches?: BackgroundSourceFetchResult[]
}

export type AuthorizeConnectedSource = (
  source: SourcePermissionTarget,
  params: Record<string, unknown>,
) => Promise<void>

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
  fetches: BackgroundSourceFetchResult[] | undefined,
  startedAt: number,
): RunDeveloperSourceOutput {
  return {
    data: result.items,
    execution: {
      durationMs: Math.round(performance.now() - startedAt),
      loadedAt: Date.now(),
      params,
      providerId,
      sourceId,
      sourceVersion,
    },
    ...(fetches ? { fetches } : {}),
    itemTemplate: result.itemTemplate,
    metadata: result.metadata,
  }
}

export async function runDeveloperSource(
  input: RunDeveloperSourceInput,
  authorize: AuthorizeConnectedSource,
): Promise<RunDeveloperSourceOutput> {
  const startedAt = performance.now()
  const fetches: BackgroundSourceFetchResult[] | undefined = input.debug ? [] : undefined

  if (input.providerId === undefined) {
    const request = await prepareSourceRequest(input.sourceId, input.params ?? {})
    await authorize({ ...request.source, sourceId: input.sourceId }, request.params)
    const result = await createSourceLoaderInvoker({ fetchResults: fetches }).invoke({
      params: request.params,
      source: request.source,
      sourceId: input.sourceId,
    })
    return createRunOutput(
      result,
      parseSourceId(input.sourceId).provider,
      input.sourceId,
      request.source.version,
      request.params,
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
  const serializedRegistry: unknown = JSON.parse(JSON.stringify(registry))
  const sourceId = `${input.providerId}:${input.sourceId}`
  const source = resolveSourceRegistry(serializedRegistry)[sourceId]
  if (!source) {
    throw new Error(`Source "${sourceId}" not found`)
  }

  const params = normalizeSourceParams(source, input.params ?? {})
  await authorize({ ...source, sourceId }, params)
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
    source.version,
    params,
    fetches,
    startedAt,
  )
}
