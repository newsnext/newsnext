import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type {
  ApplicationData,
  ApplicationMutationDependencies,
  ApplicationMutationExecution,
  ApplicationMutationResult,
} from "../application"
import { actionContracts } from "@newsnext/sdk/actions"
import { loadSourceDescriptor } from "@newsnext/source-kit/runtime"
import {
  configureLiveCardMutation,
  configureLiveWidgetMutation,
  createBoardMutation,
  createLiveCardMutation,
  createLiveWidgetMutation,
  deleteBoardMutation,
  deleteLiveCardMutation,
  deleteLiveWidgetMutation,
  getBoardLiveWidgetQuery,
  getBoardQuery,
  getLiveCardQuery,
  getLiveWidgetQuery,
  getNowLayerLiveCardsQuery,
  listAllLiveWidgetsQuery,
  listBoardLiveCardsQuery,
  listBoardLiveWidgetsQuery,
  listBoardsQuery,
  listLiveCardsQuery,
  listSourcesQuery,
  moveLiveCardMutation,
  moveLiveWidgetMutation,
  resetLiveCardMetadataMutation,
  resetLiveCardParamsMutation,
  resetLiveWidgetMetadataMutation,
  resetLiveWidgetParamsMutation,
  setLiveWidgetLayoutsMutation,
  setNextLayerManualOrderMutation,
  setNowLayerManualOrderMutation,
  updateBoardMutation,
} from "../application"
import { defineAction } from "./action-definition"

// Action service takes integrations via factory args; never import Native Messaging here (cycle).
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

async function readLiveCard(context: ApplicationActionContext, cardId: string) {
  return getLiveCardQuery(await context.data(), { cardId })
}

async function readBoardLiveWidget(context: ApplicationActionContext, boardId: string, liveWidgetId: string) {
  return getBoardLiveWidgetQuery(await context.data(), { boardId, liveWidgetId })
}

async function readLiveWidget(context: ApplicationActionContext, liveWidgetId: string) {
  return getLiveWidgetQuery(await context.data(), { liveWidgetId })
}

const boardCreateAction = defineAction(actionContracts["board.create"], async (input, context: ApplicationActionContext) => {
  await context.requireSources((input.liveCards ?? []).map(card => card.sourceId))
  const result = await context.mutate((data, dependencies) => createBoardMutation(data, input, dependencies))
  if (!result.boardId) throw new Error("Board creation returned no Board ID")
  const { board } = getBoardQuery(await context.data(), { boardId: result.boardId })
  return { boardId: result.boardId, board }
})
const boardUpdateAction = defineAction(actionContracts["board.update"], async (input, context: ApplicationActionContext) => {
  await context.mutate(data => updateBoardMutation(data, input))
  return getBoardQuery(await context.data(), { boardId: input.boardId }).board
})

const boardDeleteAction = defineAction(actionContracts["board.delete"], async (input, context: ApplicationActionContext) => (
  await context.mutate(
    data => deleteBoardMutation(data, input),
    {
      deletedBoardId: input.boardId,
      targetBoardId: input.targetBoardId,
    },
  )
))

const nowLayerSetManualOrderAction = defineAction(actionContracts["nowLayer.setManualOrder"], async (input, context: ApplicationActionContext) => {
  await context.mutate(data => setNowLayerManualOrderMutation(data, input))
  return getNowLayerLiveCardsQuery(await context.data(), input.boardId)
})

const nextLayerSetManualOrderAction = defineAction(actionContracts["nextLayer.setManualOrder"], async (input, context: ApplicationActionContext) => {
  await context.mutate(data => setNextLayerManualOrderMutation(data, input))
  return listBoardLiveWidgetsQuery(await context.data(), { boardId: input.boardId })
    .map(widget => ({ ...widget, boardId: input.boardId }))
})

const liveWidgetCreateAction = defineAction(actionContracts["liveWidget.create"], async (input, context: ApplicationActionContext) => {
  const result = await context.mutate((data, dependencies) => createLiveWidgetMutation(data, input, dependencies))
  if (!result.liveWidgetId) throw new Error("Widget creation returned no instance ID")
  const liveWidget = await readBoardLiveWidget(context, input.boardId, result.liveWidgetId)
  return { liveWidgetId: result.liveWidgetId, liveWidget }
})

const boardListLiveWidgetsAction = defineAction(actionContracts["board.listLiveWidgets"], async (input, context: ApplicationActionContext) => (
  listBoardLiveWidgetsQuery(await context.data(), input)
))

const liveWidgetListAction = defineAction(actionContracts["liveWidget.list"], async (_input, context: ApplicationActionContext) => (
  listAllLiveWidgetsQuery(await context.data())
))

const liveWidgetGetAction = defineAction(actionContracts["liveWidget.get"], async (input, context: ApplicationActionContext) => (
  getLiveWidgetQuery(await context.data(), input)
))

const liveWidgetMoveAction = defineAction(actionContracts["liveWidget.move"], async (input, context: ApplicationActionContext) => {
  await context.mutate(data => moveLiveWidgetMutation(data, input))
  return readLiveWidget(context, input.liveWidgetId)
})

const liveWidgetDeleteAction = defineAction(actionContracts["liveWidget.delete"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => deleteLiveWidgetMutation(data, input))
))

const liveWidgetConfigureAction = defineAction(actionContracts["liveWidget.configure"], async (input, context: ApplicationActionContext) => {
  await context.mutate(data => configureLiveWidgetMutation(data, input))
  return readLiveWidget(context, input.liveWidgetId)
})

const liveWidgetSetLayoutsAction = defineAction(actionContracts["liveWidget.setLayouts"], async (input, context: ApplicationActionContext) => {
  await context.mutate(data => setLiveWidgetLayoutsMutation(data, input))
  return listBoardLiveWidgetsQuery(await context.data(), { boardId: input.boardId })
    .map(widget => ({ ...widget, boardId: input.boardId }))
})

const liveWidgetResetMetadataAction = defineAction(actionContracts["liveWidget.resetMetadata"], async (input, context: ApplicationActionContext) => {
  await context.mutate(data => resetLiveWidgetMetadataMutation(data, input))
  return readLiveWidget(context, input.liveWidgetId)
})

const liveWidgetResetParamsAction = defineAction(actionContracts["liveWidget.resetParams"], async (input, context: ApplicationActionContext) => {
  await context.mutate(data => resetLiveWidgetParamsMutation(data, input))
  return readLiveWidget(context, input.liveWidgetId)
})

const liveCardMoveAction = defineAction(actionContracts["liveCard.move"], async (input, context: ApplicationActionContext) => {
  await context.mutate(data => moveLiveCardMutation(data, input))
  return readLiveCard(context, input.cardId)
})

const liveCardCreateAction = defineAction(actionContracts["liveCard.create"], async (input, context: ApplicationActionContext) => {
  await context.requireSources([input.sourceId])
  const result = await context.mutate((data, dependencies) => createLiveCardMutation(data, input, dependencies))
  if (!result.cardId) throw new Error("LiveCard creation returned no LiveCard ID")
  const liveCard = await readLiveCard(context, result.cardId)
  return { cardId: result.cardId, liveCard }
})

const liveCardConfigureAction = defineAction(actionContracts["liveCard.configure"], async (input, context: ApplicationActionContext) => {
  await context.mutate(data => configureLiveCardMutation(data, input))
  return readLiveCard(context, input.cardId)
})

const liveCardResetMetadataAction = defineAction(actionContracts["liveCard.resetMetadata"], async (input, context: ApplicationActionContext) => {
  await context.mutate(data => resetLiveCardMetadataMutation(data, input))
  return readLiveCard(context, input.cardId)
})

const liveCardResetParamsAction = defineAction(actionContracts["liveCard.resetParams"], async (input, context: ApplicationActionContext) => {
  await context.mutate(data => resetLiveCardParamsMutation(data, input))
  return readLiveCard(context, input.cardId)
})

const liveCardDeleteAction = defineAction(actionContracts["liveCard.delete"], async (input, context: ApplicationActionContext) => (
  await context.mutate(data => deleteLiveCardMutation(data, input))
))

const sourceListAction = defineAction(actionContracts["source.list"], async (_input, context: ApplicationActionContext) => listSourcesQuery(await context.sources()))

const sourceGetAction = defineAction(actionContracts["source.get"], async input => loadSourceDescriptor(input.sourceId))

const boardListAction = defineAction(actionContracts["board.list"], async (_input, context: ApplicationActionContext) => listBoardsQuery(await context.data()))

const boardGetAction = defineAction(actionContracts["board.get"], async (input, context: ApplicationActionContext) => getBoardQuery(await context.data(), input))

const boardListLiveCardsAction = defineAction(actionContracts["board.listLiveCards"], async (input, context: ApplicationActionContext) => (
  listBoardLiveCardsQuery(await context.data(), input)
))

const liveCardListAction = defineAction(actionContracts["liveCard.list"], async (_input, context: ApplicationActionContext) => listLiveCardsQuery(await context.data()))

const liveCardGetAction = defineAction(actionContracts["liveCard.get"], async (input, context: ApplicationActionContext) => getLiveCardQuery(await context.data(), input))

const nowLayerGetLiveCardsAction = defineAction(actionContracts["nowLayer.getLiveCards"], async (input, context: ApplicationActionContext) => (
  getNowLayerLiveCardsQuery(await context.data(), input.boardId)
))

const applicationReplaceAction = defineAction(actionContracts["application.replace"], async (input, context: ApplicationActionContext) => await context.replace(input))

export const applicationActionDefinitions = [
  boardCreateAction,
  boardUpdateAction,
  boardDeleteAction,
  nowLayerSetManualOrderAction,
  nextLayerSetManualOrderAction,
  liveWidgetCreateAction,
  boardListLiveWidgetsAction,
  liveWidgetListAction,
  liveWidgetGetAction,
  liveWidgetDeleteAction,
  liveWidgetMoveAction,
  liveWidgetSetLayoutsAction,
  liveWidgetConfigureAction,
  liveWidgetResetMetadataAction,
  liveWidgetResetParamsAction,
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
  nowLayerGetLiveCardsAction,
  applicationReplaceAction,
] as const
