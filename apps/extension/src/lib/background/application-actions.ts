import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type {
  ApplicationData,
  ApplicationMutationDependencies,
  ApplicationMutationExecution,
  ApplicationMutationResult,
} from "../application"
import { actionContracts } from "@newsnext/sdk/actions"
import {
  configureLiveCardMutation,
  configureLiveWidgetMutation,
  createBoardMutation,
  createLiveCardMutation,
  deleteBoardMutation,
  deleteLiveCardMutation,
  getBoardConfigurationQuery,
  getBoardContextQuery,
  getBoardQuery,
  getLiveCardQuery,
  getNowLayerLiveCardsQuery,
  getSourceQuery,
  installLiveWidgetMutation,
  listBoardLiveCardsQuery,
  listBoardsQuery,
  listLiveCardsQuery,
  listSourcesQuery,
  moveLiveCardMutation,
  moveLiveWidgetMutation,
  removeLiveWidgetMutation,
  resetLiveCardMetadataMutation,
  resetLiveCardParamsMutation,
  setLiveWidgetDataScopeMutation,
  setLiveWidgetLayoutsMutation,
  setLiveWidgetMetadataMutation,
  setLiveWidgetParamsMutation,
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
  await context.requireSources((input.liveCards ?? []).map(card => card.sourceId))
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

const nextLayerInstallWidgetAction = defineAction(actionContracts["nextLayer.installLiveWidget"], async (input, context: ApplicationActionContext) => {
  const result = await context.mutate((data, dependencies) => installLiveWidgetMutation(data, input, dependencies))
  if (!result.liveWidgetId) throw new Error("Widget creation returned no instance ID")
  return { liveWidgetId: result.liveWidgetId }
})

const nextLayerMoveWidgetAction = defineAction(actionContracts["nextLayer.moveLiveWidget"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => moveLiveWidgetMutation(data, input))
))

const nextLayerRemoveWidgetAction = defineAction(actionContracts["nextLayer.removeLiveWidget"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => removeLiveWidgetMutation(data, input))
))

const nextLayerSetWidgetDataScopeAction = defineAction(actionContracts["nextLayer.setLiveWidgetDataScope"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setLiveWidgetDataScopeMutation(data, input))
))

const nextLayerConfigureWidgetAction = defineAction(actionContracts["nextLayer.configureLiveWidget"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => configureLiveWidgetMutation(data, input))
))

const nextLayerSetWidgetMetadataAction = defineAction(actionContracts["nextLayer.setLiveWidgetMetadata"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setLiveWidgetMetadataMutation(data, input))
))

const nextLayerSetWidgetParamsAction = defineAction(actionContracts["nextLayer.setLiveWidgetParams"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setLiveWidgetParamsMutation(data, input))
))

const nextLayerSetWidgetLayoutsAction = defineAction(actionContracts["nextLayer.setLiveWidgetLayouts"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setLiveWidgetLayoutsMutation(data, input))
))

const liveCardMoveAction = defineAction(actionContracts["liveCard.move"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => moveLiveCardMutation(data, input))
))

const liveCardCreateAction = defineAction(actionContracts["liveCard.create"], async (input, context: ApplicationActionContext) => {
  await context.requireSources([input.sourceId])
  const result = await context.mutate((data, dependencies) => createLiveCardMutation(data, input, dependencies))
  if (!result.cardId) throw new Error("LiveCard creation returned no LiveCard ID")
  return { cardId: result.cardId }
})

const liveCardConfigureAction = defineAction(actionContracts["liveCard.configure"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => configureLiveCardMutation(data, input))
))

const liveCardResetMetadataAction = defineAction(actionContracts["liveCard.resetMetadata"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => resetLiveCardMetadataMutation(data, input))
))

const liveCardResetParamsAction = defineAction(actionContracts["liveCard.resetParams"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => resetLiveCardParamsMutation(data, input))
))

const liveCardDeleteAction = defineAction(actionContracts["liveCard.delete"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => deleteLiveCardMutation(data, input))
))

const sourceListAction = defineAction(actionContracts["source.list"], async (_input, context: ApplicationActionContext) => listSourcesQuery(await context.sources()))

const sourceGetAction = defineAction(actionContracts["source.get"], async (input, context: ApplicationActionContext) => getSourceQuery(await context.sources(), input))

const boardListAction = defineAction(actionContracts["board.list"], async (_input, context: ApplicationActionContext) => listBoardsQuery(await context.data()))

const boardGetAction = defineAction(actionContracts["board.get"], async (input, context: ApplicationActionContext) => getBoardQuery(await context.data(), input))

const boardListLiveCardsAction = defineAction(actionContracts["board.listLiveCards"], async (input, context: ApplicationActionContext) => (
  listBoardLiveCardsQuery(await context.data(), input)
))

const liveCardListAction = defineAction(actionContracts["liveCard.list"], async (_input, context: ApplicationActionContext) => listLiveCardsQuery(await context.data()))

const liveCardGetAction = defineAction(actionContracts["liveCard.get"], async (input, context: ApplicationActionContext) => getLiveCardQuery(await context.data(), input))

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
  nextLayerConfigureWidgetAction,
  liveCardMoveAction,
  liveCardCreateAction,
  liveCardConfigureAction,
  liveCardResetParamsAction,
  liveCardResetMetadataAction,
  liveCardDeleteAction,
  sourceListAction,
  sourceGetAction,
  boardListAction,
  boardGetAction,
  boardListLiveCardsAction,
  liveCardListAction,
  liveCardGetAction,
  boardGetContextAction,
  boardGetConfigurationAction,
  nowLayerGetLiveCardsAction,
  applicationReplaceAction,
] as const
