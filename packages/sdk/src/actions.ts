import type { JsonObject, JsonValue } from "./types.js"

export interface ActionDescriptor {
  name: string
  description: string
  kind: "mutation" | "query" | "command"
  inputSchema: JsonObject
  outputSchema: JsonObject
}

export interface FetchInput {
  url: string
  method?: string
  headers?: [string, string][]
  body?: string
}
export interface FetchResult {
  status: number
  statusText: string
  headers: [string, string][]
  body: string
}
export type RunInput = {
  sourceId: string
  params?: JsonObject
  debug?: boolean
} & ({ provider?: never, providerId?: never, useProviderSecrets?: never } | { provider: JsonObject, providerId: string, useProviderSecrets?: boolean })

export interface RunResult {
  data: JsonObject[]
  execution: {
    durationMs: number
    loadedAt: number
    params: JsonObject
    providerId: string
    sourceId: string
    sourceVersion: number
  }
  fetches?: JsonValue[]
}
