import type { Client, NestedClient } from "@orpc/client"
import type { NewsItem, SourceDescriptor } from "@/typings/source"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import { BatchLinkPlugin } from "@orpc/client/plugins"
import { createTanstackQueryUtils } from "@orpc/tanstack-query"
import { getAppURL } from "@/lib/env"

interface GetSourceInput {
  sourceId: string
  params?: Record<string, unknown>
  latest?: boolean
}

interface SourceInstanceInput {
  instanceId: string
  sourceKey: string
  params: Record<string, unknown>
  isFork: boolean
  createdAt?: number
}

interface SourceInstanceState {
  instanceId: string
  sourceKey: string
  params: Record<string, unknown>
  isFork: boolean
  createdAt: number
}

interface SaveSourceStateInput {
  sourceInstances: SourceInstanceInput[]
  starredSourceInstanceIds: string[]
}

interface SourceInstanceIdInput {
  instanceId: string
}

interface SetStarredSourceInstanceInput {
  instanceId: string
  starred: boolean
}

interface SourceLoadResult {
  id: string
  key: string
  updated: number
  status: "success" | "cache"
  items: NewsItem[]
}

interface SourceState {
  sourceInstances: SourceInstanceState[]
  starredSourceInstanceIds: string[]
}

interface MutationResult {
  ok: true
}

interface AppClient extends Record<string, NestedClient<Record<never, never>>> {
  getBoard: Client<Record<never, never>, undefined, SourceDescriptor[], unknown>
  getSource: Client<Record<never, never>, GetSourceInput, SourceLoadResult, unknown>
  getSourceState: Client<Record<never, never>, undefined, SourceState, unknown>
  saveSourceState: Client<Record<never, never>, SaveSourceStateInput, MutationResult, unknown>
  upsertSourceInstance: Client<Record<never, never>, SourceInstanceInput, MutationResult, unknown>
  deleteSourceInstance: Client<Record<never, never>, SourceInstanceIdInput, MutationResult, unknown>
  setStarredSourceInstance: Client<Record<never, never>, SetStarredSourceInstanceInput, MutationResult, unknown>
  resetSourceInstanceParams: Client<Record<never, never>, SourceInstanceIdInput, MutationResult, unknown>
}

const link = new RPCLink({
  url: getAppURL("/api/orpc"),
  plugins: [
    new BatchLinkPlugin({
      mode: "streaming",
      groups: [
        {
          condition: () => true,
          context: {},
        },
      ],
    }),
  ],
  fetch(request, init) {
    return fetch(request, {
      ...init,
      credentials: "include",
    })
  },
})

export const client = createORPCClient<AppClient>(link)
export const orpc = createTanstackQueryUtils(client)
