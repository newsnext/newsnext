import type { ApplicationBoardContext, ApplicationData, ApplicationNowLayerLiveCard, Board, BoardConfigurationResult, BoardDeleteInput, BoardDetail, LiveCard, LiveCardPatch, LiveWidgetDataScope, LiveWidgetLayout, SourceDescriptor } from "../models/index.js"
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

const LiveCardPatchParams = Type.Unsafe<LiveCardPatch>(Type.Object({
  metadata: Type.Optional(RecordValue),
  params: Type.Optional(RecordValue),
}, { additionalProperties: false }))

const LiveCardCreationParams = Type.Object({
  patch: LiveCardPatchParams,
  sourceId: Identifier,
}, { additionalProperties: false })

const BoardCreatedResult = Type.Object({
  boardId: Identifier,
}, { additionalProperties: false })

const LiveCardCreatedResult = Type.Object({
  cardId: Identifier,
}, { additionalProperties: false })

const WidgetLayoutParams = Type.Unsafe<LiveWidgetLayout>(Type.Object({
  height: Type.Integer({ minimum: 1, maximum: 100 }),
  width: Type.Integer({ minimum: 1, maximum: 12 }),
  x: Type.Integer({ minimum: 0, maximum: 11 }),
  y: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false }))

const WidgetDataScopeParams = Type.Unsafe<LiveWidgetDataScope>(Type.Union([
  Type.Object({ type: Type.Literal("board") }, { additionalProperties: false }),
  Type.Object({
    cardIds: IdentifierArray,
    type: Type.Literal("cards"),
  }, { additionalProperties: false }),
]))

const boardCreateAction = defineActionContract({
  name: "board.create",
  kind: "mutation",
  description: "Create a Board and optional configured LiveCards.",
  params: Type.Object({
    ...BoardConfigurationParams.properties,
    liveCards: Type.Optional(Type.Array(LiveCardCreationParams)),
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
    deleteLiveCards: Type.Literal(true),
  }, { additionalProperties: false }),
  Type.Object({
    boardId: Identifier,
    targetBoardId: Identifier,
  }, { additionalProperties: false }),
]))

const boardDeleteAction = defineActionContract({
  name: "board.delete",
  kind: "mutation",
  description: "Delete a Board and either delete or transfer its LiveCards.",
  params: BoardDeleteParams,
  result: EmptyObject,
})

const nowLayerSetManualOrderAction = defineActionContract({
  name: "nowLayer.setManualOrder",
  kind: "mutation",
  description: "Set the complete manual LiveCard order for a Board's Now Layer.",
  params: Type.Object({
    boardId: Identifier,
    cardIds: IdentifierArray,
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const nextLayerInstallWidgetAction = defineActionContract({
  name: "nextLayer.installLiveWidget",
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

const nextLayerMoveWidgetAction = defineActionContract({
  name: "nextLayer.moveLiveWidget",
  kind: "mutation",
  description: "Move a Widget placement to another Board while preserving its settings and size.",
  params: Type.Object({ boardId: Identifier, targetBoardId: Identifier, widgetId: Identifier }, { additionalProperties: false }),
  result: EmptyObject,
})

const nextLayerRemoveWidgetAction = defineActionContract({
  name: "nextLayer.removeLiveWidget",
  kind: "mutation",
  description: "Remove a local Widget from a Board's Next Layer.",
  params: Type.Object({
    boardId: Identifier,
    widgetId: Identifier,
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const nextLayerSetWidgetDataScopeAction = defineActionContract({
  name: "nextLayer.setLiveWidgetDataScope",
  kind: "mutation",
  description: "Set the Board-scoped LiveCard access granted to a Next Layer Widget.",
  params: Type.Object({
    boardId: Identifier,
    dataScope: WidgetDataScopeParams,
    widgetId: Identifier,
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const nextLayerSetWidgetMetadataAction = defineActionContract({
  name: "nextLayer.setLiveWidgetMetadata",
  kind: "mutation",
  description: "Replace a Board Widget's display metadata overrides; an empty object restores its definition.",
  params: Type.Object({
    boardId: Identifier,
    widgetId: Identifier,
    metadata: Type.Object({
      title: Type.Optional(Type.String()),
      badge: Type.Optional(Type.String()),
      desc: Type.Optional(Type.String()),
      home: Type.Optional(Type.String()),
      color: Type.Optional(stringEnum(COLORS)),
    }, { additionalProperties: false }),
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const nextLayerSetWidgetParamsAction = defineActionContract({
  name: "nextLayer.setLiveWidgetParams",
  kind: "mutation",
  description: "Replace a Board Widget's parameter overrides; pass an empty object to reset defaults.",
  params: Type.Object({
    boardId: Identifier,
    widgetId: Identifier,
    params: Type.Record(Type.String(), Type.Unknown()),
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const nextLayerSetWidgetLayoutsAction = defineActionContract({
  name: "nextLayer.setLiveWidgetLayouts",
  kind: "mutation",
  description: "Persist one or more Next Layer Widget positions and sizes.",
  params: Type.Object({
    boardId: Identifier,
    liveWidgets: Type.Array(Type.Object({
      layout: WidgetLayoutParams,
      widgetId: Identifier,
    }, { additionalProperties: false }), { minItems: 1 }),
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const liveCardMoveAction = defineActionContract({
  name: "liveCard.move",
  kind: "mutation",
  description: "Move an existing LiveCard to a Board.",
  params: Type.Object({
    boardId: Identifier,
    cardId: Identifier,
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const liveCardCreateAction = defineActionContract({
  name: "liveCard.create",
  kind: "mutation",
  description: "Create a configured LiveCard in one Board.",
  params: Type.Object({
    boardId: Identifier,
    patch: LiveCardPatchParams,
    sourceId: Identifier,
  }, { additionalProperties: false }),
  result: LiveCardCreatedResult,
})

const liveCardConfigureAction = defineActionContract({
  name: "liveCard.configure",
  kind: "mutation",
  description: "Merge configuration and presentation overrides into a LiveCard.",
  params: Type.Object({
    cardId: Identifier,
    patch: LiveCardPatchParams,
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const liveCardResetMetadataAction = defineActionContract({
  name: "liveCard.resetMetadata",
  kind: "mutation",
  description: "Reset a LiveCard's presentation overrides while preserving its parameters.",
  params: Type.Object({ cardId: Identifier }, { additionalProperties: false }),
  result: EmptyObject,
})

const liveCardResetParamsAction = defineActionContract({
  name: "liveCard.resetParams",
  kind: "mutation",
  description: "Reset a LiveCard's parameters while preserving presentation overrides.",
  params: Type.Object({ cardId: Identifier }, { additionalProperties: false }),
  result: EmptyObject,
})

const liveCardDeleteAction = defineActionContract({
  name: "liveCard.delete",
  kind: "mutation",
  description: "Delete a LiveCard from its Board.",
  params: Type.Object({ cardId: Identifier }, { additionalProperties: false }),
  result: EmptyObject,
})

const sourceListAction = defineActionContract({
  name: "source.list",
  kind: "query",
  description: "List Sources available for creating or resolving LiveCards.",
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
  description: "Get a Board with ordered entries and resolved LiveCards.",
  params: Type.Object({ boardId: Identifier }, { additionalProperties: false }),
  result: typedObjectResult<BoardDetail>(),
})

const boardListLiveCardsAction = defineActionContract({
  name: "board.listLiveCards",
  kind: "query",
  description: "List the LiveCards in a Board in membership order.",
  params: Type.Object({ boardId: Identifier }, { additionalProperties: false }),
  result: typedArrayResult<LiveCard[]>(),
})

const liveCardListAction = defineActionContract({
  name: "liveCard.list",
  kind: "query",
  description: "List configured LiveCards.",
  params: EmptyObject,
  result: typedArrayResult<LiveCard[]>(),
})

const liveCardGetAction = defineActionContract({
  name: "liveCard.get",
  kind: "query",
  description: "Get one configured LiveCard.",
  params: Type.Object({ cardId: Identifier }, { additionalProperties: false }),
  result: typedObjectResult<LiveCard>(),
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
  liveCards: Type.Array(Type.Unknown()),
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
  nextLayerMoveWidgetAction,
  nextLayerSetWidgetDataScopeAction,
  nextLayerSetWidgetLayoutsAction,
  nextLayerSetWidgetParamsAction,
  nextLayerSetWidgetMetadataAction,
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
