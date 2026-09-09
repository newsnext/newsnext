import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type {
  ApplicationData,
  ApplicationMutationDependencies,
  ApplicationMutationExecution,
  ApplicationMutationResult,
} from "../application"
import { applicationActionContracts, defineAction } from "@newsnext/sdk/actions"
import {
  configureInstanceMutation,
  createBoardMutation,
  createInstanceMutation,
  deleteBoardMutation,
  deleteInstanceMutation,
  getBoardConfigurationQuery,
  getBoardContextQuery,
  getBoardQuery,
  getInstanceQuery,
  getNowLayerLiveCardsQuery,
  getSourceQuery,
  installNextLayerWidgetMutation,
  listBoardInstancesQuery,
  listBoardsQuery,
  listInstancesQuery,
  listSourcesQuery,
  moveInstanceMutation,
  removeNextLayerWidgetMutation,
  resetInstanceParamsMutation,
  setNextLayerWidgetDataScopeMutation,
  setNextLayerWidgetLayoutsMutation,
  setNowLayerManualOrderMutation,
  updateBoardMutation,
} from "../application"

export interface ApplicationActionContext {
  data: () => Promise<ApplicationData>
  mutate: (
    operation: (
      data: ApplicationData,
      dependencies: ApplicationMutationDependencies,
    ) => ApplicationMutationExecution,
    options?: {
      deletedBoardId?: string
      targetBoardId?: string
    },
  ) => Promise<ApplicationMutationResult>
  replace: (data: ApplicationData) => Promise<ApplicationData>
  requireSources: (sourceIds: string[]) => Promise<void>
  sources: () => Promise<SourceDescriptor[]>
}

const boardCreateAction = defineAction(applicationActionContracts["board.create"], async (input, context: ApplicationActionContext) => {
  await context.requireSources((input.instances ?? []).map(instance => instance.sourceId))
  const result = await context.mutate((data, dependencies) => createBoardMutation(data, input, dependencies))
  if (!result.boardId) throw new Error("Board creation returned no Board ID")
  return { boardId: result.boardId }
})
const boardUpdateAction = defineAction(applicationActionContracts["board.update"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => updateBoardMutation(data, input))
))

const boardDeleteAction = defineAction(applicationActionContracts["board.delete"], async (input, context: ApplicationActionContext) => (
  await context.mutate(
    data => deleteBoardMutation(data, input),
    {
      deletedBoardId: input.boardId,
      targetBoardId: input.targetBoardId,
    },
  )
))

const nowLayerSetManualOrderAction = defineAction(applicationActionContracts["nowLayer.setManualOrder"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setNowLayerManualOrderMutation(data, input))
))

const nextLayerInstallWidgetAction = defineAction(applicationActionContracts["nextLayer.installWidget"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => installNextLayerWidgetMutation(data, input))
))

const nextLayerRemoveWidgetAction = defineAction(applicationActionContracts["nextLayer.removeWidget"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => removeNextLayerWidgetMutation(data, input))
))

const nextLayerSetWidgetDataScopeAction = defineAction(applicationActionContracts["nextLayer.setWidgetDataScope"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setNextLayerWidgetDataScopeMutation(data, input))
))

const nextLayerSetWidgetLayoutsAction = defineAction(applicationActionContracts["nextLayer.setWidgetLayouts"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setNextLayerWidgetLayoutsMutation(data, input))
))

const instanceMoveAction = defineAction(applicationActionContracts["instance.move"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => moveInstanceMutation(data, input))
))

const instanceCreateAction = defineAction(applicationActionContracts["instance.create"], async (input, context: ApplicationActionContext) => {
  await context.requireSources([input.sourceId])
  const result = await context.mutate((data, dependencies) => createInstanceMutation(data, input, dependencies))
  if (!result.instanceId) throw new Error("Instance creation returned no Instance ID")
  return { instanceId: result.instanceId }
})

const instanceConfigureAction = defineAction(applicationActionContracts["instance.configure"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => configureInstanceMutation(data, input))
))

const instanceResetParamsAction = defineAction(applicationActionContracts["instance.resetParams"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => resetInstanceParamsMutation(data, input))
))

const instanceDeleteAction = defineAction(applicationActionContracts["instance.delete"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => deleteInstanceMutation(data, input))
))

const sourceListAction = defineAction(applicationActionContracts["source.list"], async (_input, context: ApplicationActionContext) => listSourcesQuery(await context.sources()))

const sourceGetAction = defineAction(applicationActionContracts["source.get"], async (input, context: ApplicationActionContext) => getSourceQuery(await context.sources(), input))

const boardListAction = defineAction(applicationActionContracts["board.list"], async (_input, context: ApplicationActionContext) => listBoardsQuery(await context.data()))

const boardGetAction = defineAction(applicationActionContracts["board.get"], async (input, context: ApplicationActionContext) => getBoardQuery(await context.data(), input))

const boardListInstancesAction = defineAction(applicationActionContracts["board.listInstances"], async (input, context: ApplicationActionContext) => (
  listBoardInstancesQuery(await context.data(), input)
))

const instanceListAction = defineAction(applicationActionContracts["instance.list"], async (_input, context: ApplicationActionContext) => listInstancesQuery(await context.data()))

const instanceGetAction = defineAction(applicationActionContracts["instance.get"], async (input, context: ApplicationActionContext) => getInstanceQuery(await context.data(), input))

const boardGetContextAction = defineAction(applicationActionContracts["board.getContext"], async (input, context: ApplicationActionContext) => (
  getBoardContextQuery(await context.data(), input.boardId)
))

const boardGetConfigurationAction = defineAction(applicationActionContracts["board.getConfiguration"], async (input, context: ApplicationActionContext) => (
  getBoardConfigurationQuery(await context.data(), input)
))

const nowLayerGetLiveCardsAction = defineAction(applicationActionContracts["nowLayer.getLiveCards"], async (input, context: ApplicationActionContext) => (
  getNowLayerLiveCardsQuery(await context.data(), input.boardId)
))

const applicationReplaceAction = defineAction(applicationActionContracts["application.replace"], async (input, context: ApplicationActionContext) => await context.replace(input))

export const applicationActionDefinitions = [
  boardCreateAction,
  boardUpdateAction,
  boardDeleteAction,
  nowLayerSetManualOrderAction,
  nextLayerInstallWidgetAction,
  nextLayerRemoveWidgetAction,
  nextLayerSetWidgetDataScopeAction,
  nextLayerSetWidgetLayoutsAction,
  instanceMoveAction,
  instanceCreateAction,
  instanceConfigureAction,
  instanceResetParamsAction,
  instanceDeleteAction,
  sourceListAction,
  sourceGetAction,
  boardListAction,
  boardGetAction,
  boardListInstancesAction,
  instanceListAction,
  instanceGetAction,
  boardGetContextAction,
  boardGetConfigurationAction,
  nowLayerGetLiveCardsAction,
  applicationReplaceAction,
] as const
