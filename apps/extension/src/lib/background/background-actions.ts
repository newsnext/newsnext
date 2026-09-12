import type { ConnectedFetchInput, FetchResponse, WorkspaceResolution } from "@newsnext/sdk/models"
import type { ResolvedRadarSuggestion } from "../radar"
import type { LiveCard } from "../source"
import type { SourceLoadResponse } from "../source/load-result"
import type { ApplicationActionContext } from "./application-actions"
import type {
  RunDeveloperSourceInput,
  RunDeveloperSourceOutput,
} from "./developer-source-runner"
import type { NativeIntegrationStatus } from "./native-integration"
import type { CollectionStatus as NativeCollectionStatus } from "@/lib/native-protocol/CollectionStatus"
import type { LogEntry as NativeLogEntry } from "@/lib/native-protocol/LogEntry"
import { actionContracts } from "@newsnext/sdk/actions"
import { defineAction } from "./action-definition"

export type { ConnectedFetchInput } from "@newsnext/sdk/models"

export interface BackgroundActionContext extends ApplicationActionContext {
  developer: {
    fetch: (input: ConnectedFetchInput) => Promise<FetchResponse>
    runSource: (input: RunDeveloperSourceInput) => Promise<RunDeveloperSourceOutput>
  }
  radar: {
    resolveSuggestions: (input: {
      tabId: number
      title?: string
      url: string
    }) => Promise<ResolvedRadarSuggestion[]>
  }
  loader: {
    loadLiveCard: (input: { card: LiveCard }) => Promise<SourceLoadResponse>
    readLiveCardCache: (input: { card: LiveCard }) => Promise<SourceLoadResponse | null>
  }
  source: {
    cancel: (input: { requestId: string }) => Promise<void>
    load: (input: {
      params?: Record<string, unknown>
      requestId?: string
      sourceId: string
    }) => Promise<SourceLoadResponse>
  }
  nativeIntegration: {
    getLogs: () => Promise<NativeLogEntry[]>
    getCollectionStatus: () => Promise<NativeCollectionStatus>
    setCollectionSubscribed: (enabled: boolean) => void
    getStatus: () => Promise<NativeIntegrationStatus>
    resolveWorkspace: (input: { resolution: WorkspaceResolution, expectedRevision: number }) => Promise<NativeIntegrationStatus>
    setEnabled: (input: { enabled: boolean }) => Promise<NativeIntegrationStatus>
  }
  liveCardRouter: {
    load: (input: { cardId: string }) => Promise<SourceLoadResponse>
    readCache: (input: { cardId: string }) => Promise<SourceLoadResponse | null>
  }
  workerManagement: {
    regenerateIdentity: () => Promise<NativeIntegrationStatus>
    takeOver: (input: { cardIds: string[], workerId: string }) => Promise<NativeIntegrationStatus>
  }
}

const developerFetchAction = defineAction(actionContracts["developer.fetch"], async (input, context: BackgroundActionContext) => await context.developer.fetch({
  ...input,
  method: input.method.toUpperCase(),
}), {
  input: input => ({
    body: input.body === undefined ? undefined : "[redacted]",
    headerNames: input.headers.map(([headerName]) => headerName),
    method: input.method.toUpperCase(),
    timeoutMs: input.timeoutMs,
    url: input.url,
  }),
  output: output => ({
    body: "[redacted]",
    headerNames: output.headers.map(([headerName]) => headerName),
    status: output.status,
    statusText: output.statusText,
  }),
})

const developerRunSourceAction = defineAction(actionContracts["developer.runSource"], async (input, context: BackgroundActionContext) => await context.developer.runSource(input), {
  input: input => ({
    debug: input.debug,
    params: input.params,
    providerId: input.providerId,
    sourceId: input.sourceId,
    useProviderSecrets: input.useProviderSecrets,
  }),
})

const radarResolveSuggestionsAction = defineAction(actionContracts["radar.resolveSuggestions"], async (input, context: BackgroundActionContext) => await context.radar.resolveSuggestions(input))

const sourceLoadAction = defineAction(actionContracts["source.load"], async (input, context: BackgroundActionContext) => await context.source.load(input))

const sourceCancelAction = defineAction(actionContracts["source.cancel"], async (input, context: BackgroundActionContext) => {
  await context.source.cancel(input)
  return {}
})

const loaderLoadLiveCardAction = defineAction(actionContracts["loader.loadLiveCard"], async (input, context: BackgroundActionContext) => (
  await context.loader.loadLiveCard(input)
))

const loaderReadLiveCardCacheAction = defineAction(actionContracts["loader.readLiveCardCache"], async (input, context: BackgroundActionContext) => (
  await context.loader.readLiveCardCache(input)
))

const nativeIntegrationGetStatusAction = defineAction(actionContracts["nativeIntegration.getStatus"], async (_input, context: BackgroundActionContext) => await context.nativeIntegration.getStatus())

const nativeIntegrationGetLogsAction = defineAction(actionContracts["nativeIntegration.getLogs"], async (_input, context: BackgroundActionContext) => await context.nativeIntegration.getLogs())

const liveCardLoadAction = defineAction(actionContracts["liveCard.load"], async (input, context: BackgroundActionContext) => (
  await context.liveCardRouter.load(input)
))

const liveCardReadCacheAction = defineAction(actionContracts["liveCard.readCache"], async (input, context: BackgroundActionContext) => (
  await context.liveCardRouter.readCache(input)
))

const nativeIntegrationSetEnabledAction = defineAction(actionContracts["nativeIntegration.setEnabled"], async (input, context: BackgroundActionContext) => await context.nativeIntegration.setEnabled(input))

const nativeIntegrationResolveWorkspaceAction = defineAction(actionContracts["nativeIntegration.resolveWorkspace"], async (input, context: BackgroundActionContext) => await context.nativeIntegration.resolveWorkspace(input))

const workerRegenerateIdentityAction = defineAction(actionContracts["worker.regenerateIdentity"], async (_input, context: BackgroundActionContext) => (
  await context.workerManagement.regenerateIdentity()
))

const workerTakeOverAction = defineAction(actionContracts["worker.takeOver"], async (input, context: BackgroundActionContext) => await context.workerManagement.takeOver(input))

export const backgroundActionDefinitions = [
  developerFetchAction,
  developerRunSourceAction,
  loaderLoadLiveCardAction,
  loaderReadLiveCardCacheAction,
  radarResolveSuggestionsAction,
  sourceLoadAction,
  sourceCancelAction,
  liveCardLoadAction,
  liveCardReadCacheAction,
  nativeIntegrationGetLogsAction,
  nativeIntegrationGetStatusAction,
  nativeIntegrationSetEnabledAction,
  nativeIntegrationResolveWorkspaceAction,
  workerRegenerateIdentityAction,
  workerTakeOverAction,
] as const
