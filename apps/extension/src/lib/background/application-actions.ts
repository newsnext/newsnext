import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type {
  ApplicationData,
  ApplicationMutationDependencies,
  ApplicationMutationExecution,
  ApplicationMutationResult,
} from "../application"
import { actionContracts } from "@newsnext/sdk/actions"
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
  moveNextLayerWidgetMutation,
  removeNextLayerWidgetMutation,
  resetInstanceMetadataMutation,
  resetInstanceParamsMutation,
  setNextLayerWidgetDataScopeMutation,
  setNextLayerWidgetLayoutsMutation,
  setNextLayerWidgetMetadataMutation,
  setNextLayerWidgetParamsMutation,
  setNowLayerManualOrderMutation,
  updateBoardMutation,
} from "../application"
import { defineAction } from "./action-definition"

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

const boardCreateAction = defineAction(actionContracts["board.create"], async (input, context: ApplicationActionContext) => {
  await context.requireSources((input.instances ?? []).map(instance => instance.sourceId))
  const result = await context.mutate((data, dependencies) => createBoardMutation(data, input, dependencies))
  if (!result.boardId) throw new Error("Board creation returned no Board ID")
  return { boardId: result.boardId }
})
const boardUpdateAction = defineAction(actionContracts["board.update"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => updateBoardMutation(data, input))
))

const boardDeleteAction = defineAction(actionContracts["board.delete"], async (input, context: ApplicationActionContext) => (
  await context.mutate(
    data => deleteBoardMutation(data, input),
    {
      deletedBoardId: input.boardId,
      targetBoardId: input.targetBoardId,
    },
  )
))

const nowLayerSetManualOrderAction = defineAction(actionContracts["nowLayer.setManualOrder"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setNowLayerManualOrderMutation(data, input))
))

const nextLayerInstallWidgetAction = defineAction(actionContracts["nextLayer.installWidget"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => installNextLayerWidgetMutation(data, input))
))

const nextLayerMoveWidgetAction = defineAction(actionContracts["nextLayer.moveWidget"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => moveNextLayerWidgetMutation(data, input))
))

const nextLayerRemoveWidgetAction = defineAction(actionContracts["nextLayer.removeWidget"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => removeNextLayerWidgetMutation(data, input))
))

const nextLayerSetWidgetDataScopeAction = defineAction(actionContracts["nextLayer.setWidgetDataScope"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setNextLayerWidgetDataScopeMutation(data, input))
))

const nextLayerSetWidgetMetadataAction = defineAction(actionContracts["nextLayer.setWidgetMetadata"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setNextLayerWidgetMetadataMutation(data, input))
))

const nextLayerSetWidgetParamsAction = defineAction(actionContracts["nextLayer.setWidgetParams"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setNextLayerWidgetParamsMutation(data, input))
))

const nextLayerSetWidgetLayoutsAction = defineAction(actionContracts["nextLayer.setWidgetLayouts"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setNextLayerWidgetLayoutsMutation(data, input))
))

const instanceMoveAction = defineAction(actionContracts["instance.move"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => moveInstanceMutation(data, input))
))

const instanceCreateAction = defineAction(actionContracts["instance.create"], async (input, context: ApplicationActionContext) => {
  await context.requireSources([input.sourceId])
  const result = await context.mutate((data, dependencies) => createInstanceMutation(data, input, dependencies))
  if (!result.instanceId) throw new Error("Instance creation returned no Instance ID")
  return { instanceId: result.instanceId }
})

const instanceConfigureAction = defineAction(actionContracts["instance.configure"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => configureInstanceMutation(data, input))
))

const instanceResetMetadataAction = defineAction(actionContracts["instance.resetMetadata"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => resetInstanceMetadataMutation(data, input))
))

const instanceResetParamsAction = defineAction(actionContracts["instance.resetParams"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => resetInstanceParamsMutation(data, input))
))

const instanceDeleteAction = defineAction(actionContracts["instance.delete"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => deleteInstanceMutation(data, input))
))

const sourceListAction = defineAction(actionContracts["source.list"], async (_input, context: ApplicationActionContext) => listSourcesQuery(await context.sources()))

const sourceGetAction = defineAction(actionContracts["source.get"], async (input, context: ApplicationActionContext) => getSourceQuery(await context.sources(), input))

const boardListAction = defineAction(actionContracts["board.list"], async (_input, context: ApplicationActionContext) => listBoardsQuery(await context.data()))

const boardGetAction = defineAction(actionContracts["board.get"], async (input, context: ApplicationActionContext) => getBoardQuery(await context.data(), input))

const boardListInstancesAction = defineAction(actionContracts["board.listInstances"], async (input, context: ApplicationActionContext) => (
  listBoardInstancesQuery(await context.data(), input)
))

const instanceListAction = defineAction(actionContracts["instance.list"], async (_input, context: ApplicationActionContext) => listInstancesQuery(await context.data()))

const instanceGetAction = defineAction(actionContracts["instance.get"], async (input, context: ApplicationActionContext) => getInstanceQuery(await context.data(), input))

const boardGetContextAction = defineAction(actionContracts["board.getContext"], async (input, context: ApplicationActionContext) => (
  getBoardContextQuery(await context.data(), input.boardId)
))

const boardGetConfigurationAction = defineAction(actionContracts["board.getConfiguration"], async (input, context: ApplicationActionContext) => (
  getBoardConfigurationQuery(await context.data(), input)
))

const nowLayerGetLiveCardsAction = defineAction(actionContracts["nowLayer.getLiveCards"], async (input, context: ApplicationActionContext) => (
  getNowLayerLiveCardsQuery(await context.data(), input.boardId)
))

const applicationReplaceAction = defineAction(actionContracts["application.replace"], async (input, context: ApplicationActionContext) => await context.replace(input))

export const applicationActionDefinitions = [
  boardCreateAction,
  boardUpdateAction,
  boardDeleteAction,
  nowLayerSetManualOrderAction,
  nextLayerInstallWidgetAction,
  nextLayerRemoveWidgetAction,
  nextLayerMoveWidgetAction,
  nextLayerSetWidgetDataScopeAction,
  nextLayerSetWidgetLayoutsAction,
  nextLayerSetWidgetParamsAction,
  nextLayerSetWidgetMetadataAction,
  instanceMoveAction,
  instanceCreateAction,
  instanceConfigureAction,
  instanceResetParamsAction,
  instanceResetMetadataAction,
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
