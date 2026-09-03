import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type {
  ApplicationData,
  ApplicationMutationDependencies,
  ApplicationMutationExecution,
  ApplicationMutationResult,
  BoardDeleteInput,
} from "../application"
import type { NextLayerWidgetDataScope, NextLayerWidgetLayout } from "../board"
import type { InstancePatch } from "../source"
import { COLORS } from "@newsnext/shared/constants"
import Type from "typebox"
import { defineAction } from "../action"
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

const CONNECTED_AND_UI = ["connected", "ui"] as const
const UI_ONLY = ["ui"] as const
const EmptyResult = Type.Object({}, { additionalProperties: false })
const Identifier = Type.String({ minLength: 1 })
const IdentifierArray = Type.Array(Identifier, { uniqueItems: true })
const RecordValue = Type.Record(Type.String(), Type.Unknown())
const BoardConfigurationParams = Type.Object({
  color: Type.Optional(stringEnum(COLORS)),
  defaultLayer: Type.Optional(stringEnum(["now", "next"] as const)),
  sortMode: Type.Optional(stringEnum(["addedAt", "provider", "manual"] as const)),
}, { additionalProperties: false })
const InstancePatchParams = Type.Unsafe<InstancePatch>(Type.Object({
  metadata: Type.Optional(RecordValue),
  params: Type.Optional(RecordValue),
}, { additionalProperties: false }))
const InstanceCreationParams = Type.Object({
  patch: InstancePatchParams,
  sourceId: Identifier,
}, { additionalProperties: false })
const BoardCreatedResult = Type.Object({
  boardId: Identifier,
}, { additionalProperties: false })
const InstanceCreatedResult = Type.Object({
  instanceId: Identifier,
}, { additionalProperties: false })
const WidgetLayoutParams = Type.Unsafe<NextLayerWidgetLayout>(Type.Object({
  height: Type.Integer({ minimum: 1, maximum: 100 }),
  width: Type.Integer({ minimum: 1, maximum: 12 }),
  x: Type.Integer({ minimum: 0, maximum: 11 }),
  y: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false }))
const WidgetDataScopeParams = Type.Unsafe<NextLayerWidgetDataScope>(Type.Union([
  Type.Object({ type: Type.Literal("board") }, { additionalProperties: false }),
  Type.Object({
    instanceIds: IdentifierArray,
    type: Type.Literal("instances"),
  }, { additionalProperties: false }),
]))

const boardCreateAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "board.create",
  kind: "mutation",
  description: "Create a Board and optional configured Instances.",
  params: Type.Object({
    ...BoardConfigurationParams.properties,
    instances: Type.Optional(Type.Array(InstanceCreationParams)),
    name: Identifier,
  }, { additionalProperties: false }),
  result: BoardCreatedResult,
}, async (input, context: ApplicationActionContext) => {
  await context.requireSources((input.instances ?? []).map(instance => instance.sourceId))
  const result = await context.mutate((data, dependencies) => createBoardMutation(data, input, dependencies))
  if (!result.boardId) throw new Error("Board creation returned no Board ID")
  return { boardId: result.boardId }
})
const boardUpdateAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "board.update",
  kind: "mutation",
  description: "Atomically update a Board.",
  params: Type.Object({
    ...BoardConfigurationParams.properties,
    boardId: Identifier,
    name: Type.Optional(Identifier),
  }, { additionalProperties: false }),
  result: EmptyResult,
  validate(input) {
    if (input.name === undefined
      && input.color === undefined
      && input.defaultLayer === undefined
      && input.sortMode === undefined) {
      throw new Error("Board update requires at least one change")
    }
  },
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => updateBoardMutation(data, input))
))

const BoardDeleteParams = Type.Unsafe<BoardDeleteInput>(Type.Union([
  Type.Object({
    boardId: Identifier,
    deleteInstances: Type.Literal(true),
  }, { additionalProperties: false }),
  Type.Object({
    boardId: Identifier,
    targetBoardId: Identifier,
  }, { additionalProperties: false }),
]))

const boardDeleteAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "board.delete",
  kind: "mutation",
  description: "Delete a Board and either delete or transfer its Instances.",
  params: BoardDeleteParams,
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(
    data => deleteBoardMutation(data, input),
    {
      deletedBoardId: input.boardId,
      targetBoardId: input.targetBoardId,
    },
  )
))

const nowLayerSetManualOrderAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "nowLayer.setManualOrder",
  kind: "mutation",
  description: "Set the complete manual LiveCard order for a Board's Now Layer.",
  params: Type.Object({
    boardId: Identifier,
    instanceIds: IdentifierArray,
  }, { additionalProperties: false }),
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setNowLayerManualOrderMutation(data, input))
))

const nextLayerInstallWidgetAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "nextLayer.installWidget",
  kind: "mutation",
  description: "Install a local Widget in a Board's Next Layer.",
  params: Type.Object({
    boardId: Identifier,
    dataScope: WidgetDataScopeParams,
    layout: WidgetLayoutParams,
    widgetId: Identifier,
  }, { additionalProperties: false }),
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => installNextLayerWidgetMutation(data, input))
))

const nextLayerRemoveWidgetAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "nextLayer.removeWidget",
  kind: "mutation",
  description: "Remove a local Widget from a Board's Next Layer.",
  params: Type.Object({
    boardId: Identifier,
    widgetId: Identifier,
  }, { additionalProperties: false }),
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => removeNextLayerWidgetMutation(data, input))
))

const nextLayerSetWidgetDataScopeAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "nextLayer.setWidgetDataScope",
  kind: "mutation",
  description: "Set the Board-scoped Instance access granted to a Next Layer Widget.",
  params: Type.Object({
    boardId: Identifier,
    dataScope: WidgetDataScopeParams,
    widgetId: Identifier,
  }, { additionalProperties: false }),
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setNextLayerWidgetDataScopeMutation(data, input))
))

const nextLayerSetWidgetLayoutsAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "nextLayer.setWidgetLayouts",
  kind: "mutation",
  description: "Persist one or more Next Layer Widget positions and sizes.",
  params: Type.Object({
    boardId: Identifier,
    widgets: Type.Array(Type.Object({
      layout: WidgetLayoutParams,
      widgetId: Identifier,
    }, { additionalProperties: false }), { minItems: 1 }),
  }, { additionalProperties: false }),
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setNextLayerWidgetLayoutsMutation(data, input))
))

const instanceMoveAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "instance.move",
  kind: "mutation",
  description: "Move an existing Instance to a Board.",
  params: Type.Object({
    boardId: Identifier,
    instanceId: Identifier,
  }, { additionalProperties: false }),
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => moveInstanceMutation(data, input))
))

const instanceCreateAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "instance.create",
  kind: "mutation",
  description: "Create a configured Instance in one Board.",
  params: Type.Object({
    boardId: Identifier,
    patch: InstancePatchParams,
    sourceId: Identifier,
  }, { additionalProperties: false }),
  result: InstanceCreatedResult,
}, async (input, context: ApplicationActionContext) => {
  await context.requireSources([input.sourceId])
  const result = await context.mutate((data, dependencies) => createInstanceMutation(data, input, dependencies))
  if (!result.instanceId) throw new Error("Instance creation returned no Instance ID")
  return { instanceId: result.instanceId }
})

const instanceConfigureAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "instance.configure",
  kind: "mutation",
  description: "Merge configuration and presentation overrides into an Instance.",
  params: Type.Object({
    instanceId: Identifier,
    patch: InstancePatchParams,
  }, { additionalProperties: false }),
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => configureInstanceMutation(data, input))
))

const instanceResetParamsAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "instance.resetParams",
  kind: "mutation",
  description: "Reset an Instance's parameters while preserving presentation overrides.",
  params: Type.Object({ instanceId: Identifier }, { additionalProperties: false }),
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => resetInstanceParamsMutation(data, input))
))

const instanceDeleteAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "instance.delete",
  kind: "mutation",
  description: "Delete an Instance from its Board.",
  params: Type.Object({ instanceId: Identifier }, { additionalProperties: false }),
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => deleteInstanceMutation(data, input))
))

const EmptyParams = Type.Object({}, { additionalProperties: false })

const sourceListAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "source.list",
  kind: "query",
  description: "List Sources available for creating or resolving Instances.",
  params: EmptyParams,
  result: typedArrayResult<ReturnType<typeof listSourcesQuery>>(),
}, async (_input, context: ApplicationActionContext) => listSourcesQuery(await context.sources()))

const sourceGetAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "source.get",
  kind: "query",
  description: "Get one available Source descriptor.",
  params: Type.Object({ sourceId: Identifier }, { additionalProperties: false }),
  result: typedObjectResult<ReturnType<typeof getSourceQuery>>(),
}, async (input, context: ApplicationActionContext) => getSourceQuery(await context.sources(), input))

const boardListAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "board.list",
  kind: "query",
  description: "List Boards.",
  params: EmptyParams,
  result: typedArrayResult<ReturnType<typeof listBoardsQuery>>(),
}, async (_input, context: ApplicationActionContext) => listBoardsQuery(await context.data()))

const boardGetAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "board.get",
  kind: "query",
  description: "Get a Board with ordered entries and resolved Instances.",
  params: Type.Object({ boardId: Identifier }, { additionalProperties: false }),
  result: typedObjectResult<ReturnType<typeof getBoardQuery>>(),
}, async (input, context: ApplicationActionContext) => getBoardQuery(await context.data(), input))

const boardListInstancesAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "board.listInstances",
  kind: "query",
  description: "List the Instances in a Board in membership order.",
  params: Type.Object({ boardId: Identifier }, { additionalProperties: false }),
  result: typedArrayResult<ReturnType<typeof listBoardInstancesQuery>>(),
}, async (input, context: ApplicationActionContext) => (
  listBoardInstancesQuery(await context.data(), input)
))

const instanceListAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "instance.list",
  kind: "query",
  description: "List configured Instances.",
  params: EmptyParams,
  result: typedArrayResult<ReturnType<typeof listInstancesQuery>>(),
}, async (_input, context: ApplicationActionContext) => listInstancesQuery(await context.data()))

const instanceGetAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "instance.get",
  kind: "query",
  description: "Get one configured Instance.",
  params: Type.Object({ instanceId: Identifier }, { additionalProperties: false }),
  result: typedObjectResult<ReturnType<typeof getInstanceQuery>>(),
}, async (input, context: ApplicationActionContext) => getInstanceQuery(await context.data(), input))

const boardGetContextAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "board.getContext",
  kind: "query",
  description: "Get one Board's presentation context and underlying identity.",
  params: Type.Object({ boardId: Identifier }, { additionalProperties: false }),
  result: typedObjectResult<ReturnType<typeof getBoardContextQuery>>(),
}, async (input, context: ApplicationActionContext) => (
  getBoardContextQuery(await context.data(), input.boardId)
))

const boardGetConfigurationAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "board.getConfiguration",
  kind: "query",
  description: "Get the durable Board configuration for a Board.",
  params: Type.Object({ boardId: Identifier }, { additionalProperties: false }),
  result: typedObjectResult<ReturnType<typeof getBoardConfigurationQuery>>(),
}, async (input, context: ApplicationActionContext) => (
  getBoardConfigurationQuery(await context.data(), input)
))

const nowLayerGetLiveCardsAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "nowLayer.getLiveCards",
  kind: "query",
  description: "List the LiveCards in one Board's Now Layer.",
  params: Type.Object({ boardId: Identifier }, { additionalProperties: false }),
  result: typedArrayResult<ReturnType<typeof getNowLayerLiveCardsQuery>>(),
}, async (input, context: ApplicationActionContext) => (
  getNowLayerLiveCardsQuery(await context.data(), input.boardId)
))

const ApplicationDataSchema = Type.Unsafe<ApplicationData>(Type.Object({
  boards: Type.Array(Type.Unknown()),
  instances: Type.Array(Type.Unknown()),
  version: Type.Number(),
}, { additionalProperties: false }))

const applicationReplaceAction = defineAction({
  audiences: UI_ONLY,
  name: "application.replace",
  kind: "mutation",
  description: "Replace all durable Application data after validating its integrity.",
  params: ApplicationDataSchema,
  result: ApplicationDataSchema,
}, async (input, context: ApplicationActionContext) => await context.replace(input))

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

function stringEnum<const Values extends readonly string[]>(values: Values) {
  return Type.Unsafe<Values[number]>({ type: "string", enum: values })
}

function typedObjectResult<Result extends object>() {
  return Type.Unsafe<Result>(Type.Object({}))
}

function typedArrayResult<Result extends unknown[]>() {
  return Type.Unsafe<Result>(Type.Array(Type.Unknown()))
}
