import type { RunDeveloperSourceInput, RunDeveloperSourceOutput } from "@newsnext/sdk/models"
import type { ProviderConfig } from "@newsnext/source-kit/registry"
import type { SourceLoaderResult } from "@newsnext/source-kit/types"
import type { SourceLoadResponse } from "../source/load-result"
import type { SourcePermissionTarget } from "../source/permissions"
import type { BackgroundSourceFetchResult } from "./source-fetch"
import {
  flattenProviderConfig,
  resolveSourceRegistry,
} from "@newsnext/source-kit/registry"
import { normalizeSourceParams, parseSourceId, prepareSourceRequest } from "@newsnext/source-kit/runtime"
import { toLoadedSourceDescriptor, toSourceLoadResult } from "../source/load-result"
import { executeSourceSnapshot } from "./protected-source-loader"
import { createBackgroundSourceFetch } from "./source-fetch"
import { createSourceLoaderInvoker } from "./source-loader-invoker"
import { resolveSourceSecrets, updateSourceSecrets } from "./source-secrets"

export type { RunDeveloperSourceInput, RunDeveloperSourceOutput } from "@newsnext/sdk/models"

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

function createSnapshotRunOutput(
  response: SourceLoadResponse,
  identifiers: { providerId: string, sourceId: string, sourceVersion: number },
  fetches: BackgroundSourceFetchResult[] | undefined,
  startedAt: number,
): RunDeveloperSourceOutput {
  return createRunOutput(
    response.result,
    identifiers.providerId,
    identifiers.sourceId,
    identifiers.sourceVersion,
    response.params,
    // A protected hit executes nothing, so there are no fetches to report.
    response.fetchProtected ? undefined : fetches,
    startedAt,
  )
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
    inlinePresentation: result.inlinePresentation,
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
    const invoker = createSourceLoaderInvoker({ fetchResults: fetches })
    const response = await executeSourceSnapshot(
      {
        params: request.params,
        sourceId: input.sourceId,
        version: request.source.version,
      },
      toLoadedSourceDescriptor(request.source, input.sourceId),
      () => invoker.invoke({
        params: request.params,
        source: request.source,
        sourceId: input.sourceId,
      }),
    )
    return createSnapshotRunOutput(
      response,
      {
        providerId: parseSourceId(input.sourceId).provider,
        sourceId: input.sourceId,
        sourceVersion: request.source.version,
      },
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
  const response = await executeSourceSnapshot(
    { params, sourceId, version: source.version },
    toLoadedSourceDescriptor(source, sourceId),
    async () => {
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
      return toSourceLoadResult(source, sourceId, result)
    },
  )

  return createSnapshotRunOutput(
    response,
    { providerId: input.providerId, sourceId, sourceVersion: source.version },
    fetches,
    startedAt,
  )
}
