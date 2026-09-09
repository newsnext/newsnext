import type { ConnectedFetchInput, FetchResponse } from "@newsnext/sdk/models"
import type { CollectionStatus as NativeCollectionStatus } from "@newsnext/sdk/protocol/CollectionStatus"
import type { LogEntry as NativeLogEntry } from "@newsnext/sdk/protocol/LogEntry"
import type { ResolvedRadarSuggestion } from "../radar"
import type { Instance } from "../source"
import type { SourceLoadResponse } from "../source/load-result"
import type { ApplicationActionContext } from "./application-actions"
import type {
  RunDeveloperSourceInput,
  RunDeveloperSourceOutput,
} from "./developer-source-runner"
import type { NativeIntegrationStatus } from "./native-integration"
import { backgroundActionContracts, defineAction } from "@newsnext/sdk/actions"

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
  job: {
    executeInstance: (input: { instance: Instance }) => Promise<SourceLoadResponse>
  }
  loader: {
    loadInstance: (input: { instance: Instance }) => Promise<SourceLoadResponse>
    readInstanceCache: (input: { instance: Instance }) => Promise<SourceLoadResponse | null>
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
    setEnabled: (input: { enabled: boolean }) => Promise<NativeIntegrationStatus>
  }
  instanceRouter: {
    load: (input: { instanceId: string }) => Promise<SourceLoadResponse>
    readCache: (input: { instanceId: string }) => Promise<SourceLoadResponse | null>
  }
  widgetSnapshots: {
    get: (input: {
      boardId: string
      widgetId: string
    }) => Promise<unknown>
  }
  workerManagement: {
    regenerateIdentity: () => Promise<NativeIntegrationStatus>
    takeOver: (input: { instanceIds: string[], workerId: string }) => Promise<NativeIntegrationStatus>
  }
}

const developerFetchAction = defineAction(backgroundActionContracts["developer.fetch"], async (input, context: BackgroundActionContext) => await context.developer.fetch({
  ...input,
  method: input.method.toUpperCase(),
}))

const developerRunSourceAction = defineAction(backgroundActionContracts["developer.runSource"], async (input, context: BackgroundActionContext) => await context.developer.runSource(input))

const radarResolveSuggestionsAction = defineAction(backgroundActionContracts["radar.resolveSuggestions"], async (input, context: BackgroundActionContext) => await context.radar.resolveSuggestions(input))

const sourceLoadAction = defineAction(backgroundActionContracts["source.load"], async (input, context: BackgroundActionContext) => await context.source.load(input))

const sourceCancelAction = defineAction(backgroundActionContracts["source.cancel"], async (input, context: BackgroundActionContext) => {
  await context.source.cancel(input)
  return {}
})

const jobExecuteInstanceAction = defineAction(backgroundActionContracts["job.executeInstance"], async (input, context: BackgroundActionContext) => (
  await context.job.executeInstance(input)
))

const loaderLoadInstanceAction = defineAction(backgroundActionContracts["loader.loadInstance"], async (input, context: BackgroundActionContext) => (
  await context.loader.loadInstance(input)
))

const loaderReadInstanceCacheAction = defineAction(backgroundActionContracts["loader.readInstanceCache"], async (input, context: BackgroundActionContext) => (
  await context.loader.readInstanceCache(input)
))

const nativeIntegrationGetStatusAction = defineAction(backgroundActionContracts["nativeIntegration.getStatus"], async (_input, context: BackgroundActionContext) => await context.nativeIntegration.getStatus())

const nativeIntegrationGetLogsAction = defineAction(backgroundActionContracts["nativeIntegration.getLogs"], async (_input, context: BackgroundActionContext) => await context.nativeIntegration.getLogs())

const instanceLoadAction = defineAction(backgroundActionContracts["instance.load"], async (input, context: BackgroundActionContext) => (
  await context.instanceRouter.load(input)
))

const instanceReadCacheAction = defineAction(backgroundActionContracts["instance.readCache"], async (input, context: BackgroundActionContext) => (
  await context.instanceRouter.readCache(input)
))

const nativeIntegrationSetEnabledAction = defineAction(backgroundActionContracts["nativeIntegration.setEnabled"], async (input, context: BackgroundActionContext) => await context.nativeIntegration.setEnabled(input))

const workerRegenerateIdentityAction = defineAction(backgroundActionContracts["worker.regenerateIdentity"], async (_input, context: BackgroundActionContext) => (
  await context.workerManagement.regenerateIdentity()
))

const workerTakeOverAction = defineAction(backgroundActionContracts["worker.takeOver"], async (input, context: BackgroundActionContext) => await context.workerManagement.takeOver(input))

const nextLayerGetWidgetSnapshotAction = defineAction(backgroundActionContracts["nextLayer.getWidgetSnapshot"], async (input, context: BackgroundActionContext) => (
  await context.widgetSnapshots.get(input)
))

export const backgroundActionDefinitions = [
  developerFetchAction,
  developerRunSourceAction,
  jobExecuteInstanceAction,
  loaderLoadInstanceAction,
  loaderReadInstanceCacheAction,
  radarResolveSuggestionsAction,
  sourceLoadAction,
  sourceCancelAction,
  instanceLoadAction,
  instanceReadCacheAction,
  nativeIntegrationGetLogsAction,
  nativeIntegrationGetStatusAction,
  nativeIntegrationSetEnabledAction,
  nextLayerGetWidgetSnapshotAction,
  workerRegenerateIdentityAction,
  workerTakeOverAction,
] as const
