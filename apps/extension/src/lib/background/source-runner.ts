import type {
  SourceConnectionProviderRunRequest,
  SourceConnectionRegisteredRunRequest,
} from "@newsnext/shared/types"
import type { NewsItem } from "@newsnext/source/typings"
import type { ProviderConfig } from "@newsnext/source/utils/source"
import {
  loadSourceDescriptors,
  normalizeSourceParams,
} from "@newsnext/source/service"
import {
  flattenProviderConfig,
  resolveSourceRegistry,
} from "@newsnext/source/utils/source"
import { resolveSourceSecrets, updateSourceSecrets } from "./source-secrets"
import { createBackgroundSourceService } from "./source-service"

export type RunConnectedSourceInput
  = | Omit<SourceConnectionRegisteredRunRequest, "id" | "type">
    | Omit<SourceConnectionProviderRunRequest, "id" | "type">

export interface RunConnectedSourceOutput {
  data: NewsItem[]
}

export interface ListConnectedSourcesOutput {
  data: string[]
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

export async function listConnectedSources(): Promise<ListConnectedSourcesOutput> {
  const sources = await loadSourceDescriptors()
  return {
    data: sources.map(source => source.id).sort(),
  }
}

export async function runConnectedSource(
  input: RunConnectedSourceInput,
): Promise<RunConnectedSourceOutput> {
  if (input.providerId === undefined) {
    const result = await createBackgroundSourceService().load({
      sourceId: input.sourceId,
      params: input.params,
    })
    return { data: result.items }
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
  const data = await source.loader(params, {
    secrets,
    updateSecrets: async (updates) => {
      Object.assign(secrets, updates)
      await updateSourceSecrets(source, secretProviderId, updates)
    },
  })

  return { data }
}
