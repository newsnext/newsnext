import type { SourceDescriptor } from "@newsnext/source-kit/types"
import type {
  ApplicationData,
  ApplicationMutationDependencies,
  ApplicationMutationExecution,
  ApplicationMutationResult,
  BoardConfiguration,
  CollectionDeleteInput,
} from "../application"
import type { InstancePatch } from "../source"
import { COLORS } from "@newsnext/shared/constants"
import Type from "typebox"
import { defineAction } from "../action"
import {
  addCollectionInstanceMutation,
  configureBoardMutation,
  configureInstanceMutation,
  createCollectionMutation,
  createInstanceMutation,
  deleteCollectionMutation,
  deleteInstanceMutation,
  getBoardConfigurationQuery,
  getBoardContextQuery,
  getCollectionQuery,
  getInstanceQuery,
  getNowLayerLiveCardsQuery,
  getSourceQuery,
  listCollectionInstancesQuery,
  listCollectionsQuery,
  listInstancesQuery,
  listSourcesQuery,
  removeCollectionInstanceMutation,
  renameCollectionMutation,
  resetInstanceParamsMutation,
  setNowLayerManualOrderMutation,
  updateCollectionMutation,
} from "../application"

export interface ApplicationActionContext {
  currentBoardId: () => Promise<string>
  data: () => Promise<ApplicationData>
  mutate: (
    operation: (
      data: ApplicationData,
      dependencies: ApplicationMutationDependencies,
    ) => ApplicationMutationExecution,
    options?: {
      deletedCollectionId?: string
      targetCollectionId?: string
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
const CollectionCreatedResult = Type.Object({
  collectionId: Identifier,
}, { additionalProperties: false })
const InstanceCreatedResult = Type.Object({
  instanceId: Identifier,
}, { additionalProperties: false })

const collectionCreateAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "collection.create",
  kind: "mutation",
  description: "Create a Collection, its Board configuration, and optional configured Instances.",
  params: Type.Object({
    board: Type.Optional(BoardConfigurationParams),
    instances: Type.Optional(Type.Array(InstanceCreationParams)),
    name: Identifier,
  }, { additionalProperties: false }),
  result: CollectionCreatedResult,
}, async (input, context: ApplicationActionContext) => {
  await context.requireSources((input.instances ?? []).map(instance => instance.sourceId))
  const result = await context.mutate((data, dependencies) => createCollectionMutation(data, input, dependencies))
  if (!result.collectionId) throw new Error("Collection creation returned no Collection ID")
  return { collectionId: result.collectionId }
})

const collectionRenameAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "collection.rename",
  kind: "mutation",
  description: "Rename a Collection without changing its Board configuration.",
  params: Type.Object({
    collectionId: Identifier,
    name: Identifier,
  }, { additionalProperties: false }),
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => renameCollectionMutation(data, input))
))

const collectionUpdateAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "collection.update",
  kind: "mutation",
  description: "Atomically update Collection data and its Board configuration.",
  params: Type.Object({
    board: Type.Optional(BoardConfigurationParams),
    collectionId: Identifier,
    name: Type.Optional(Identifier),
  }, { additionalProperties: false }),
  result: EmptyResult,
  validate(input) {
    if (input.name === undefined && input.board === undefined) {
      throw new Error("Collection update requires a name or Board configuration")
    }
  },
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => updateCollectionMutation(data, input))
))

const boardConfigureAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "board.configure",
  kind: "mutation",
  description: "Configure the Board projection for a Collection.",
  params: Type.Unsafe<BoardConfiguration & { collectionId: string }>(Type.Object({
    collectionId: Identifier,
    color: Type.Optional(stringEnum(COLORS)),
    defaultLayer: Type.Optional(stringEnum(["now", "next"] as const)),
    sortMode: Type.Optional(stringEnum(["addedAt", "provider", "manual"] as const)),
  }, { additionalProperties: false })),
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => configureBoardMutation(data, input))
))

const CollectionDeleteParams = Type.Unsafe<CollectionDeleteInput>(Type.Union([
  Type.Object({
    collectionId: Identifier,
    deleteInstances: Type.Literal(true),
  }, { additionalProperties: false }),
  Type.Object({
    collectionId: Identifier,
    targetCollectionId: Identifier,
  }, { additionalProperties: false }),
]))

const collectionDeleteAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "collection.delete",
  kind: "mutation",
  description: "Delete a Collection and either delete exclusively owned Instances or transfer all of its Instances.",
  params: CollectionDeleteParams,
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(
    data => deleteCollectionMutation(data, input),
    {
      deletedCollectionId: input.collectionId,
      targetCollectionId: input.targetCollectionId,
    },
  )
))

const nowLayerSetManualOrderAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "nowLayer.setManualOrder",
  kind: "mutation",
  description: "Set the complete manual LiveCard order for a Collection's Now Layer.",
  params: Type.Object({
    collectionId: Identifier,
    instanceIds: IdentifierArray,
  }, { additionalProperties: false }),
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => setNowLayerManualOrderMutation(data, input))
))

const MembershipParams = Type.Object({
  collectionId: Identifier,
  instanceId: Identifier,
}, { additionalProperties: false })

const collectionAddInstanceAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "collection.addInstance",
  kind: "mutation",
  description: "Add an existing Instance to a Collection.",
  params: MembershipParams,
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => addCollectionInstanceMutation(data, input))
))

const collectionRemoveInstanceAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "collection.removeInstance",
  kind: "mutation",
  description: "Remove an Instance from one Collection while keeping at least one membership.",
  params: MembershipParams,
  result: EmptyResult,
}, async (input, context: ApplicationActionContext) => (
  await context.mutate(data => removeCollectionInstanceMutation(data, input))
))

const instanceCreateAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "instance.create",
  kind: "mutation",
  description: "Create a configured Instance and add it to one or more Collections.",
  params: Type.Object({
    collectionIds: Type.Array(Identifier, { minItems: 1, uniqueItems: true }),
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
  description: "Delete an Instance and all of its Collection memberships.",
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

const collectionListAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "collection.list",
  kind: "query",
  description: "List Collections.",
  params: EmptyParams,
  result: typedArrayResult<ReturnType<typeof listCollectionsQuery>>(),
}, async (_input, context: ApplicationActionContext) => listCollectionsQuery(await context.data()))

const collectionGetAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "collection.get",
  kind: "query",
  description: "Get a Collection with ordered entries and resolved Instances.",
  params: Type.Object({ collectionId: Identifier }, { additionalProperties: false }),
  result: typedObjectResult<ReturnType<typeof getCollectionQuery>>(),
}, async (input, context: ApplicationActionContext) => getCollectionQuery(await context.data(), input))

const collectionListInstancesAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "collection.listInstances",
  kind: "query",
  description: "List the Instances in a Collection in membership order.",
  params: Type.Object({ collectionId: Identifier }, { additionalProperties: false }),
  result: typedArrayResult<ReturnType<typeof listCollectionInstancesQuery>>(),
}, async (input, context: ApplicationActionContext) => (
  listCollectionInstancesQuery(await context.data(), input)
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
  description: "Get the current human Board and its underlying Collection identity.",
  params: EmptyParams,
  result: typedObjectResult<ReturnType<typeof getBoardContextQuery>>(),
}, async (_input, context: ApplicationActionContext) => (
  getBoardContextQuery(await context.data(), await context.currentBoardId())
))

const boardGetConfigurationAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "board.getConfiguration",
  kind: "query",
  description: "Get the durable Board configuration for a Collection.",
  params: Type.Object({ collectionId: Identifier }, { additionalProperties: false }),
  result: typedObjectResult<ReturnType<typeof getBoardConfigurationQuery>>(),
}, async (input, context: ApplicationActionContext) => (
  getBoardConfigurationQuery(await context.data(), input)
))

const nowLayerGetLiveCardsAction = defineAction({
  audiences: CONNECTED_AND_UI,
  name: "nowLayer.getLiveCards",
  kind: "query",
  description: "List the LiveCards in the current Board's Now Layer.",
  params: EmptyParams,
  result: typedArrayResult<ReturnType<typeof getNowLayerLiveCardsQuery>>(),
}, async (_input, context: ApplicationActionContext) => (
  getNowLayerLiveCardsQuery(await context.data(), await context.currentBoardId())
))

const ApplicationDataSchema = Type.Unsafe<ApplicationData>(Type.Object({
  collections: Type.Array(Type.Unknown()),
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
  collectionCreateAction,
  collectionRenameAction,
  collectionUpdateAction,
  boardConfigureAction,
  collectionDeleteAction,
  nowLayerSetManualOrderAction,
  collectionAddInstanceAction,
  collectionRemoveInstanceAction,
  instanceCreateAction,
  instanceConfigureAction,
  instanceResetParamsAction,
  instanceDeleteAction,
  sourceListAction,
  sourceGetAction,
  collectionListAction,
  collectionGetAction,
  collectionListInstancesAction,
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
