import type {
  ExtensionConnectionProviderRunRequest,
  ExtensionConnectionRegisteredRunRequest,
} from "@newsnext/extension-connection"
import type { ProviderConfig } from "@newsnext/source/registry"
import type { NewsItem } from "@newsnext/source/types"
import {
  flattenProviderConfig,
  resolveSourceRegistry,
} from "@newsnext/source/registry"
import { normalizeSourceParams } from "@newsnext/source/runtime"
import { createBackgroundSourceFetch } from "./source-fetch"
import { resolveSourceSecrets, updateSourceSecrets } from "./source-secrets"
import { createBackgroundSourceService } from "./source-service"

export type RunConnectedSourceInput
  = | Omit<ExtensionConnectionRegisteredRunRequest, "id" | "type">
    | Omit<ExtensionConnectionProviderRunRequest, "id" | "type">

export interface RunConnectedSourceOutput {
  data: NewsItem[]
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
  const signal = new AbortController().signal
  const { items: data } = await source.loader(params, {
    fetch: createBackgroundSourceFetch(
      sourceId,
      source.capabilities.network,
      signal,
    ),
    secrets,
    signal,
    updateSecrets: async (updates) => {
      Object.assign(secrets, updates)
      await updateSourceSecrets(source, secretProviderId, updates)
    },
  })

  return { data }
}
