import type { ApplicationBoardContext, ApplicationData, ApplicationNextLayerLiveWidget, ApplicationNowLayerLiveCard, Board, BoardConfigurationResult, BoardDeleteInput, BoardDetail, LiveCard, LiveCardPatch, LiveWidget, LiveWidgetDataScope, LiveWidgetInstallSize, SourceDescriptor } from "../models/index.js"
import Type from "typebox"
import { COLORS, MIN_WIDGET_WIDTH } from "../models/index.js"
import { defineActionContract } from "./definition.js"
import { BoardIdParam, CardIdArrayParam, CardIdParam, EmptyObject, Identifier, LiveWidgetIdParam, RecordValue, SourceIdParam, stringEnum, TargetBoardIdParam, WidgetIdParam } from "./schema.js"

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
  sourceId: SourceIdParam,
}, { additionalProperties: false })

const WidgetDataScopeParams = Type.Unsafe<LiveWidgetDataScope>(Type.Union([
  Type.Object({ type: Type.Literal("board") }, { additionalProperties: false }),
  Type.Object({
    cardIds: IdentifierArray,
    type: Type.Literal("cards"),
  }, { additionalProperties: false }),
]))

const WidgetInstallSizeParams = Type.Unsafe<LiveWidgetInstallSize>(Type.Object({
  height: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  width: Type.Optional(Type.Integer({ minimum: MIN_WIDGET_WIDTH, maximum: 12 })),
}, { additionalProperties: false }))

// Result schemas stay open (no additionalProperties: false): stored entities may
// carry legacy keys, and rejecting them would break query Actions. Input
// schemas above stay closed so typos fail fast for agent callers.
const LiveCardMetadataResult = Type.Object({
  badge: Type.Optional(Type.String()),
  desc: Type.Optional(Type.String()),
  home: Type.Optional(Type.String()),
  title: Type.Optional(Type.String()),
  type: Type.Optional(stringEnum(["list", "ranking"] as const)),
})

const LiveCardPatchResult = Type.Object({
  metadata: Type.Optional(LiveCardMetadataResult),
  params: Type.Optional(RecordValue),
})

const LiveCardResult = Type.Unsafe<LiveCard>(Type.Object({
  cardId: Identifier,
  createdAt: Type.Number(),
  patch: LiveCardPatchResult,
  sourceId: Identifier,
  workerId: Identifier,
}))

const LiveWidgetMetadataResult = Type.Object({
  badge: Type.Optional(Type.String()),
  color: Type.Optional(stringEnum(COLORS)),
  desc: Type.Optional(Type.String()),
  home: Type.Optional(Type.String()),
  title: Type.Optional(Type.String()),
})

const LiveWidgetPatchResult = Type.Object({
  metadata: Type.Optional(LiveWidgetMetadataResult),
  params: Type.Optional(RecordValue),
})

const LiveWidgetLayoutResult = Type.Object({
  height: Type.Integer({ minimum: 1, maximum: 100 }),
  width: Type.Integer({ minimum: MIN_WIDGET_WIDTH, maximum: 12 }),
})

const LiveWidgetFields = {
  dataScope: WidgetDataScopeParams,
  layout: LiveWidgetLayoutResult,
  liveWidgetId: Identifier,
  patch: Type.Optional(LiveWidgetPatchResult),
  widgetId: Identifier,
}

const LiveWidgetResult = Type.Unsafe<LiveWidget>(Type.Object({ ...LiveWidgetFields }))

const BoardLiveWidgetResult = Type.Unsafe<ApplicationNextLayerLiveWidget>(Type.Object({
  ...LiveWidgetFields,
  boardId: Identifier,
}))

const BoardSortResult = Type.Object({
  automaticMode: stringEnum(["addedAt", "provider"] as const),
  manualOrder: IdentifierArray,
  mode: stringEnum(["addedAt", "provider", "manual"] as const),
})

const BoardResult = Type.Unsafe<Board>(Type.Object({
  cardIds: IdentifierArray,
  color: stringEnum(COLORS),
  createdAt: Type.Number(),
  defaultLayer: stringEnum(["now", "next"] as const),
  id: Identifier,
  name: Identifier,
  nextLayer: Type.Object({
    liveWidgets: Type.Array(LiveWidgetResult),
  }),
  nowLayer: Type.Object({
    sort: BoardSortResult,
  }),
}))

const BoardDetailResult = Type.Unsafe<BoardDetail>(Type.Object({
  board: BoardResult,
  liveCards: Type.Array(LiveCardResult),
}))

const BoardContextResult = Type.Unsafe<ApplicationBoardContext>(Type.Object({
  boardId: Identifier,
  boardName: Identifier,
}))

const BoardConfigurationResultSchema = Type.Unsafe<BoardConfigurationResult>(Type.Object({
  color: stringEnum(COLORS),
  defaultLayer: stringEnum(["now", "next"] as const),
  nowLayer: Type.Object({
    sort: BoardSortResult,
  }),
}))

const NowLayerLiveCardResult = Type.Unsafe<ApplicationNowLayerLiveCard>(Type.Object({
  boardId: Identifier,
  cardId: Identifier,
  sourceId: Identifier,
}))

const BoardCreatedResult = Type.Object({
  board: BoardResult,
  boardId: Identifier,
})

const LiveCardCreatedResult = Type.Object({
  cardId: Identifier,
  liveCard: LiveCardResult,
})

const LiveWidgetCreatedResult = Type.Object({
  liveWidget: BoardLiveWidgetResult,
  liveWidgetId: Identifier,
})

const boardCreateAction = defineActionContract({
  name: "board.create",
  kind: "mutation",
  description: "Create a Board and optional configured LiveCards. Returns the created Board so callers can verify without a follow-up query.",
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
  description: "Atomically update a Board. Returns the updated Board so callers can verify without a follow-up query.",
  params: Type.Object({
    ...BoardConfigurationParams.properties,
    boardId: BoardIdParam,
    name: Type.Optional(Identifier),
  }, { additionalProperties: false }),
  result: BoardResult,
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
    boardId: BoardIdParam,
    deleteLiveCards: Type.Literal(true),
  }, { additionalProperties: false }),
  Type.Object({
    boardId: BoardIdParam,
    targetBoardId: TargetBoardIdParam,
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
  description: "Set the complete manual LiveCard order for a Board's Now Layer. Returns the ordered cards so callers can verify without a follow-up query.",
  params: Type.Object({
    boardId: BoardIdParam,
    cardIds: CardIdArrayParam,
  }, { additionalProperties: false }),
  result: Type.Array(NowLayerLiveCardResult),
})

const nextLayerInstallWidgetAction = defineActionContract({
  name: "nextLayer.installLiveWidget",
  kind: "mutation",
  description: "Create an independent instance of a local Widget in a Board's Next Layer. The placement appends after existing Widgets; omitted size fields default to 2. Returns the created placement so callers can verify without a follow-up query.",
  params: Type.Object({
    boardId: BoardIdParam,
    dataScope: WidgetDataScopeParams,
    size: WidgetInstallSizeParams,
    widgetId: WidgetIdParam,
  }, { additionalProperties: false }),
  result: LiveWidgetCreatedResult,
})

const nextLayerListWidgetsAction = defineActionContract({
  name: "nextLayer.listLiveWidgets",
  kind: "query",
  description: "List the Widget placements in a Board's Next Layer in installation order.",
  params: Type.Object({ boardId: BoardIdParam }, { additionalProperties: false }),
  result: Type.Array(LiveWidgetResult),
})

const liveWidgetListAction = defineActionContract({
  name: "liveWidget.list",
  kind: "query",
  description: "List configured LiveWidgets across all Boards in Board order. Mirrors liveCard.list.",
  params: EmptyObject,
  result: Type.Array(BoardLiveWidgetResult),
})

const nextLayerMoveWidgetAction = defineActionContract({
  name: "nextLayer.moveLiveWidget",
  kind: "mutation",
  description: "Move a Widget placement to another Board while preserving its settings and size. Returns the moved placement (with its new Board ID).",
  params: Type.Object({ boardId: BoardIdParam, targetBoardId: TargetBoardIdParam, liveWidgetId: LiveWidgetIdParam }, { additionalProperties: false }),
  result: BoardLiveWidgetResult,
})

const nextLayerRemoveWidgetAction = defineActionContract({
  name: "nextLayer.removeLiveWidget",
  kind: "mutation",
  description: "Remove a local Widget from a Board's Next Layer.",
  params: Type.Object({
    boardId: BoardIdParam,
    liveWidgetId: LiveWidgetIdParam,
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const nextLayerSetWidgetDataScopeAction = defineActionContract({
  name: "nextLayer.setLiveWidgetDataScope",
  kind: "mutation",
  description: "Set the Board-scoped LiveCard access granted to a Next Layer Widget. Returns the updated placement.",
  params: Type.Object({
    boardId: BoardIdParam,
    dataScope: WidgetDataScopeParams,
    liveWidgetId: LiveWidgetIdParam,
  }, { additionalProperties: false }),
  result: BoardLiveWidgetResult,
})

const nextLayerConfigureWidgetAction = defineActionContract({
  name: "nextLayer.configureLiveWidget",
  kind: "mutation",
  description: "Merge sparse params and metadata overrides. Null resets a section to widget.json defaults. Returns the updated placement.",
  params: Type.Object({
    boardId: BoardIdParam,
    liveWidgetId: LiveWidgetIdParam,
    patch: Type.Object({
      params: Type.Optional(Type.Union([Type.Null(), Type.Record(Type.String(), Type.Unknown())])),
      metadata: Type.Optional(Type.Union([Type.Null(), Type.Object({
        title: Type.Optional(Type.String()),
        badge: Type.Optional(Type.String()),
        desc: Type.Optional(Type.String()),
        home: Type.Optional(Type.String()),
        color: Type.Optional(stringEnum(COLORS)),
      }, { additionalProperties: false })])),
    }, { additionalProperties: false }),
  }, { additionalProperties: false }),
  result: BoardLiveWidgetResult,
})

const nextLayerSetWidgetMetadataAction = defineActionContract({
  name: "nextLayer.setLiveWidgetMetadata",
  kind: "mutation",
  description: "Replace a Board Widget's display metadata overrides; an empty object restores its definition. Returns the updated placement.",
  params: Type.Object({
    boardId: BoardIdParam,
    liveWidgetId: LiveWidgetIdParam,
    metadata: Type.Object({
      title: Type.Optional(Type.String()),
      badge: Type.Optional(Type.String()),
      desc: Type.Optional(Type.String()),
      home: Type.Optional(Type.String()),
      color: Type.Optional(stringEnum(COLORS)),
    }, { additionalProperties: false }),
  }, { additionalProperties: false }),
  result: BoardLiveWidgetResult,
})

const nextLayerSetWidgetParamsAction = defineActionContract({
  name: "nextLayer.setLiveWidgetParams",
  kind: "mutation",
  description: "Replace a Board Widget's parameter overrides; pass an empty object to reset defaults. Returns the updated placement.",
  params: Type.Object({
    boardId: BoardIdParam,
    liveWidgetId: LiveWidgetIdParam,
    params: Type.Record(Type.String(), Type.Unknown()),
  }, { additionalProperties: false }),
  result: BoardLiveWidgetResult,
})

const nextLayerSetWidgetLayoutsAction = defineActionContract({
  name: "nextLayer.setLiveWidgetLayouts",
  kind: "mutation",
  description: "Persist Widget sizes and order for a Board's Next Layer in display order. Returns the placements in display order.",
  params: Type.Object({
    boardId: BoardIdParam,
    liveWidgets: Type.Array(Type.Object({
      liveWidgetId: LiveWidgetIdParam,
      width: Type.Integer({ minimum: MIN_WIDGET_WIDTH, maximum: 12 }),
      height: Type.Integer({ minimum: 1, maximum: 100 }),
    }, { additionalProperties: false }), { minItems: 1 }),
  }, { additionalProperties: false }),
  result: Type.Array(BoardLiveWidgetResult),
})

const liveCardMoveAction = defineActionContract({
  name: "liveCard.move",
  kind: "mutation",
  description: "Move an existing LiveCard to a Board. Returns the moved LiveCard.",
  params: Type.Object({
    boardId: BoardIdParam,
    cardId: CardIdParam,
  }, { additionalProperties: false }),
  result: LiveCardResult,
})

const liveCardCreateAction = defineActionContract({
  name: "liveCard.create",
  kind: "mutation",
  description: "Create a configured LiveCard in one Board. Returns the created LiveCard so callers can verify without a follow-up query.",
  params: Type.Object({
    boardId: BoardIdParam,
    patch: LiveCardPatchParams,
    sourceId: SourceIdParam,
  }, { additionalProperties: false }),
  result: LiveCardCreatedResult,
})

const liveCardConfigureAction = defineActionContract({
  name: "liveCard.configure",
  kind: "mutation",
  description: "Merge configuration and presentation overrides into a LiveCard. Returns the updated LiveCard so callers can verify without a follow-up query.",
  params: Type.Object({
    cardId: CardIdParam,
    patch: LiveCardPatchParams,
  }, { additionalProperties: false }),
  result: LiveCardResult,
})

const liveCardResetMetadataAction = defineActionContract({
  name: "liveCard.resetMetadata",
  kind: "mutation",
  description: "Reset a LiveCard's presentation overrides while preserving its parameters. Returns the updated LiveCard.",
  params: Type.Object({ cardId: CardIdParam }, { additionalProperties: false }),
  result: LiveCardResult,
})

const liveCardResetParamsAction = defineActionContract({
  name: "liveCard.resetParams",
  kind: "mutation",
  description: "Reset a LiveCard's parameters while preserving presentation overrides. Returns the updated LiveCard.",
  params: Type.Object({ cardId: CardIdParam }, { additionalProperties: false }),
  result: LiveCardResult,
})

const liveCardDeleteAction = defineActionContract({
  name: "liveCard.delete",
  kind: "mutation",
  description: "Delete a LiveCard from its Board.",
  params: Type.Object({ cardId: CardIdParam }, { additionalProperties: false }),
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
  params: Type.Object({ sourceId: SourceIdParam }, { additionalProperties: false }),
  result: typedObjectResult<SourceDescriptor>(),
})

const boardListAction = defineActionContract({
  name: "board.list",
  kind: "query",
  description: "List Boards.",
  params: EmptyObject,
  result: Type.Array(BoardResult),
})

const boardGetAction = defineActionContract({
  name: "board.get",
  kind: "query",
  description: "Get a Board with ordered entries and resolved LiveCards.",
  params: Type.Object({ boardId: BoardIdParam }, { additionalProperties: false }),
  result: BoardDetailResult,
})

const boardListLiveCardsAction = defineActionContract({
  name: "board.listLiveCards",
  kind: "query",
  description: "List the LiveCards in a Board in membership order. Entries carry only patch overrides; the display title resolves as patch.metadata.title ?? source.metadata.title ?? provider.title.",
  params: Type.Object({ boardId: BoardIdParam }, { additionalProperties: false }),
  result: Type.Array(LiveCardResult),
})

const liveCardListAction = defineActionContract({
  name: "liveCard.list",
  kind: "query",
  description: "List configured LiveCards. Entries carry only patch overrides; the display title resolves as patch.metadata.title ?? source.metadata.title ?? provider.title. Use source.get for the fallback.",
  params: EmptyObject,
  result: Type.Array(LiveCardResult),
})

const liveCardGetAction = defineActionContract({
  name: "liveCard.get",
  kind: "query",
  description: "Get one configured LiveCard. The entry carries only patch overrides; the display title resolves as patch.metadata.title ?? source.metadata.title ?? provider.title.",
  params: Type.Object({ cardId: CardIdParam }, { additionalProperties: false }),
  result: LiveCardResult,
})

const boardGetContextAction = defineActionContract({
  name: "board.getContext",
  kind: "query",
  description: "Get one Board's presentation context and underlying identity.",
  params: Type.Object({ boardId: BoardIdParam }, { additionalProperties: false }),
  result: BoardContextResult,
})

const boardGetConfigurationAction = defineActionContract({
  name: "board.getConfiguration",
  kind: "query",
  description: "Get the durable Board configuration for a Board.",
  params: Type.Object({ boardId: BoardIdParam }, { additionalProperties: false }),
  result: BoardConfigurationResultSchema,
})

const nowLayerGetLiveCardsAction = defineActionContract({
  name: "nowLayer.getLiveCards",
  kind: "query",
  description: "List the LiveCards in one Board's Now Layer.",
  params: Type.Object({ boardId: BoardIdParam }, { additionalProperties: false }),
  result: Type.Array(NowLayerLiveCardResult),
})

const ApplicationDataSchema = Type.Unsafe<ApplicationData>(Type.Object({
  boards: Type.Array(BoardResult),
  liveCards: Type.Array(LiveCardResult),
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
  nextLayerListWidgetsAction,
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
  liveWidgetListAction,
  boardGetContextAction,
  boardGetConfigurationAction,
  nowLayerGetLiveCardsAction,
  applicationReplaceAction,
] as const
