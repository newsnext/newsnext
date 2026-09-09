import type { ApplicationBoardContext, ApplicationData, ApplicationNowLayerLiveCard, Board, BoardConfigurationResult, BoardDeleteInput, BoardDetail, Instance, InstancePatch, NextLayerWidgetDataScope, NextLayerWidgetLayout, SourceDescriptor } from "../models/index.js"
import Type from "typebox"
import { COLORS } from "../models/index.js"
import { defineActionContract } from "./definition.js"
import { EmptyObject, Identifier, RecordValue, stringEnum } from "./schema.js"

const IdentifierArray = Type.Array(Identifier, { uniqueItems: true })

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

const boardCreateAction = defineActionContract({
  name: "board.create",
  kind: "mutation",
  description: "Create a Board and optional configured Instances.",
  params: Type.Object({
    ...BoardConfigurationParams.properties,
    instances: Type.Optional(Type.Array(InstanceCreationParams)),
    name: Identifier,
  }, { additionalProperties: false }),
  result: BoardCreatedResult,
})

const boardUpdateAction = defineActionContract({
  name: "board.update",
  kind: "mutation",
  description: "Atomically update a Board.",
  params: Type.Object({
    ...BoardConfigurationParams.properties,
    boardId: Identifier,
    name: Type.Optional(Identifier),
  }, { additionalProperties: false }),
  result: EmptyObject,
  validate(input) {
    if (input.name === undefined
      && input.color === undefined
      && input.defaultLayer === undefined
      && input.sortMode === undefined) {
      throw new Error("Board update requires at least one change")
    }
  },
})

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

const boardDeleteAction = defineActionContract({
  name: "board.delete",
  kind: "mutation",
  description: "Delete a Board and either delete or transfer its Instances.",
  params: BoardDeleteParams,
  result: EmptyObject,
})

const nowLayerSetManualOrderAction = defineActionContract({
  name: "nowLayer.setManualOrder",
  kind: "mutation",
  description: "Set the complete manual LiveCard order for a Board's Now Layer.",
  params: Type.Object({
    boardId: Identifier,
    instanceIds: IdentifierArray,
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const nextLayerInstallWidgetAction = defineActionContract({
  name: "nextLayer.installWidget",
  kind: "mutation",
  description: "Install a local Widget in a Board's Next Layer.",
  params: Type.Object({
    boardId: Identifier,
    dataScope: WidgetDataScopeParams,
    layout: WidgetLayoutParams,
    widgetId: Identifier,
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const nextLayerRemoveWidgetAction = defineActionContract({
  name: "nextLayer.removeWidget",
  kind: "mutation",
  description: "Remove a local Widget from a Board's Next Layer.",
  params: Type.Object({
    boardId: Identifier,
    widgetId: Identifier,
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const nextLayerSetWidgetDataScopeAction = defineActionContract({
  name: "nextLayer.setWidgetDataScope",
  kind: "mutation",
  description: "Set the Board-scoped Instance access granted to a Next Layer Widget.",
  params: Type.Object({
    boardId: Identifier,
    dataScope: WidgetDataScopeParams,
    widgetId: Identifier,
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const nextLayerSetWidgetLayoutsAction = defineActionContract({
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
  result: EmptyObject,
})

const instanceMoveAction = defineActionContract({
  name: "instance.move",
  kind: "mutation",
  description: "Move an existing Instance to a Board.",
  params: Type.Object({
    boardId: Identifier,
    instanceId: Identifier,
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const instanceCreateAction = defineActionContract({
  name: "instance.create",
  kind: "mutation",
  description: "Create a configured Instance in one Board.",
  params: Type.Object({
    boardId: Identifier,
    patch: InstancePatchParams,
    sourceId: Identifier,
  }, { additionalProperties: false }),
  result: InstanceCreatedResult,
})

const instanceConfigureAction = defineActionContract({
  name: "instance.configure",
  kind: "mutation",
  description: "Merge configuration and presentation overrides into an Instance.",
  params: Type.Object({
    instanceId: Identifier,
    patch: InstancePatchParams,
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const instanceResetParamsAction = defineActionContract({
  name: "instance.resetParams",
  kind: "mutation",
  description: "Reset an Instance's parameters while preserving presentation overrides.",
  params: Type.Object({ instanceId: Identifier }, { additionalProperties: false }),
  result: EmptyObject,
})

const instanceDeleteAction = defineActionContract({
  name: "instance.delete",
  kind: "mutation",
  description: "Delete an Instance from its Board.",
  params: Type.Object({ instanceId: Identifier }, { additionalProperties: false }),
  result: EmptyObject,
})

const sourceListAction = defineActionContract({
  name: "source.list",
  kind: "query",
  description: "List Sources available for creating or resolving Instances.",
  params: EmptyObject,
  result: typedArrayResult<SourceDescriptor[]>(),
})

const sourceGetAction = defineActionContract({
  name: "source.get",
  kind: "query",
  description: "Get one available Source descriptor.",
  params: Type.Object({ sourceId: Identifier }, { additionalProperties: false }),
  result: typedObjectResult<SourceDescriptor>(),
})

const boardListAction = defineActionContract({
  name: "board.list",
  kind: "query",
  description: "List Boards.",
  params: EmptyObject,
  result: typedArrayResult<Board[]>(),
})

const boardGetAction = defineActionContract({
  name: "board.get",
  kind: "query",
  description: "Get a Board with ordered entries and resolved Instances.",
  params: Type.Object({ boardId: Identifier }, { additionalProperties: false }),
  result: typedObjectResult<BoardDetail>(),
})

const boardListInstancesAction = defineActionContract({
  name: "board.listInstances",
  kind: "query",
  description: "List the Instances in a Board in membership order.",
  params: Type.Object({ boardId: Identifier }, { additionalProperties: false }),
  result: typedArrayResult<Instance[]>(),
})

const instanceListAction = defineActionContract({
  name: "instance.list",
  kind: "query",
  description: "List configured Instances.",
  params: EmptyObject,
  result: typedArrayResult<Instance[]>(),
})

const instanceGetAction = defineActionContract({
  name: "instance.get",
  kind: "query",
  description: "Get one configured Instance.",
  params: Type.Object({ instanceId: Identifier }, { additionalProperties: false }),
  result: typedObjectResult<Instance>(),
})

const boardGetContextAction = defineActionContract({
  name: "board.getContext",
  kind: "query",
  description: "Get one Board's presentation context and underlying identity.",
  params: Type.Object({ boardId: Identifier }, { additionalProperties: false }),
  result: typedObjectResult<ApplicationBoardContext>(),
})

const boardGetConfigurationAction = defineActionContract({
  name: "board.getConfiguration",
  kind: "query",
  description: "Get the durable Board configuration for a Board.",
  params: Type.Object({ boardId: Identifier }, { additionalProperties: false }),
  result: typedObjectResult<BoardConfigurationResult>(),
})

const nowLayerGetLiveCardsAction = defineActionContract({
  name: "nowLayer.getLiveCards",
  kind: "query",
  description: "List the LiveCards in one Board's Now Layer.",
  params: Type.Object({ boardId: Identifier }, { additionalProperties: false }),
  result: typedArrayResult<ApplicationNowLayerLiveCard[]>(),
})

const ApplicationDataSchema = Type.Unsafe<ApplicationData>(Type.Object({
  boards: Type.Array(Type.Unknown()),
  instances: Type.Array(Type.Unknown()),
  version: Type.Number(),
}, { additionalProperties: false }))

const applicationReplaceAction = defineActionContract({
  name: "application.replace",
  kind: "mutation",
  description: "Replace all durable Application data after validating its integrity.",
  params: ApplicationDataSchema,
  result: ApplicationDataSchema,
})

function typedObjectResult<Result extends object>() {
  return Type.Unsafe<Result>(Type.Object({}))
}

function typedArrayResult<Result extends unknown[]>() {
  return Type.Unsafe<Result>(Type.Array(Type.Unknown()))
}

export const applicationActionContracts = [
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
