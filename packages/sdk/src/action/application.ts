import type { ApplicationData, ApplicationNextLayerLiveWidget, ApplicationNowLayerLiveCard, Board, BoardDeleteInput, LiveCard, LiveCardPatch, LiveWidget, LiveWidgetDataScope, LiveWidgetInstallSize, SourceDescriptor } from "../models/index.js"
import Type from "typebox"
import { COLORS, MIN_WIDGET_WIDTH } from "../models/index.js"
import { defineActionContract } from "./definition.js"
import { BoardIdParam, CardIdParam, EmptyObject, Identifier, LiveWidgetIdParam, RecordValue, SourceIdParam, stringEnum, TargetBoardIdParam, WidgetIdParam } from "./schema.js"

const IdentifierArray = Type.Array(Identifier, { uniqueItems: true })

const BoardConfigurationParams = Type.Object({
  color: Type.Optional(stringEnum(COLORS)),
  layer: Type.Optional(stringEnum(["now", "next"] as const)),
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

const BoardResult = Type.Unsafe<Board>(Type.Object({
  color: stringEnum(COLORS),
  createdAt: Type.Number(),
  layer: stringEnum(["now", "next"] as const),
  id: Identifier,
  name: Identifier,
  nowLayer: Type.Object({
    liveCards: Type.Array(LiveCardResult),
  }),
  nextLayer: Type.Object({
    liveWidgets: Type.Array(LiveWidgetResult),
  }),
}))

const NowLayerLiveCardResult = Type.Unsafe<ApplicationNowLayerLiveCard>(Type.Object({
  boardId: Identifier,
  cardId: Identifier,
  sourceId: Identifier,
}))

const NextLayerLiveWidgetResult = Type.Unsafe<ApplicationNextLayerLiveWidget>(Type.Object({
  ...LiveWidgetFields,
  boardId: Identifier,
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
      && input.layer === undefined) {
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
  description: "Delete a Board and either delete or transfer its LiveCards and Live Widgets.",
  params: BoardDeleteParams,
  result: EmptyObject,
})

const nowLayerSetManualOrderAction = defineActionContract({
  name: "nowLayer.setManualOrder",
  kind: "mutation",
  description: "Set the complete manual LiveCard order for a Board's Now Layer. Returns the ordered cards so callers can verify without a follow-up query.",
  params: Type.Object({
    boardId: BoardIdParam,
    liveCards: Type.Array(CardIdParam, { uniqueItems: true, description: "LiveCard identifiers in display order; rewrites the Now Layer order." }),
  }, { additionalProperties: false }),
  result: Type.Array(NowLayerLiveCardResult),
})

const nextLayerSetManualOrderAction = defineActionContract({
  name: "nextLayer.setManualOrder",
  kind: "mutation",
  description: "Set the complete manual Widget order for a Board's Next Layer. Returns the ordered widgets so callers can verify without a follow-up query.",
  params: Type.Object({
    boardId: BoardIdParam,
    widgetIds: IdentifierArray,
  }, { additionalProperties: false }),
  result: Type.Array(NextLayerLiveWidgetResult),
})

const liveWidgetCreateAction = defineActionContract({
  name: "liveWidget.create",
  kind: "mutation",
  description: "Create a configured LiveWidget in one Board's Next Layer. The placement prepends before existing Widgets; omitted size fields default to 2. Returns the created LiveWidget so callers can verify without a follow-up query.",
  params: Type.Object({
    boardId: BoardIdParam,
    dataScope: WidgetDataScopeParams,
    size: WidgetInstallSizeParams,
    widgetId: WidgetIdParam,
  }, { additionalProperties: false }),
  result: LiveWidgetCreatedResult,
})

const boardListLiveWidgetsAction = defineActionContract({
  name: "board.listLiveWidgets",
  kind: "query",
  description: "List the Widget placements in a Board's Next Layer in display order.",
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

const liveWidgetMoveAction = defineActionContract({
  name: "liveWidget.move",
  kind: "mutation",
  description: "Move a Widget placement to another Board while preserving its settings and size. Returns the moved placement (with its new Board ID).",
  params: Type.Object({ boardId: BoardIdParam, liveWidgetId: LiveWidgetIdParam }, { additionalProperties: false }),
  result: BoardLiveWidgetResult,
})

const liveWidgetDeleteAction = defineActionContract({
  name: "liveWidget.delete",
  kind: "mutation",
  description: "Remove a local Widget from a Board's Next Layer.",
  params: Type.Object({
    liveWidgetId: LiveWidgetIdParam,
  }, { additionalProperties: false }),
  result: EmptyObject,
})

const liveWidgetConfigureAction = defineActionContract({
  name: "liveWidget.configure",
  kind: "mutation",
  description: "Merge sparse overrides into a LiveWidget. Null resets a section to widget.json defaults. Returns the updated placement.",
  params: Type.Object({
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
      dataScope: Type.Optional(Type.Union([Type.Null(), WidgetDataScopeParams])),
    }, { additionalProperties: false }),
  }, { additionalProperties: false }),
  result: BoardLiveWidgetResult,
})

const liveWidgetSetLayoutsAction = defineActionContract({
  name: "liveWidget.setLayouts",
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

const liveWidgetGetAction = defineActionContract({
  name: "liveWidget.get",
  kind: "query",
  description: "Get one configured LiveWidget. The entry carries only patch overrides; includes its Board ID.",
  params: Type.Object({ liveWidgetId: LiveWidgetIdParam }, { additionalProperties: false }),
  result: BoardLiveWidgetResult,
})

const liveWidgetResetMetadataAction = defineActionContract({
  name: "liveWidget.resetMetadata",
  kind: "mutation",
  description: "Reset a LiveWidget's presentation overrides while preserving its parameters. Returns the updated LiveWidget.",
  params: Type.Object({ liveWidgetId: LiveWidgetIdParam }, { additionalProperties: false }),
  result: BoardLiveWidgetResult,
})

const liveWidgetResetParamsAction = defineActionContract({
  name: "liveWidget.resetParams",
  kind: "mutation",
  description: "Reset a LiveWidget's parameters while preserving presentation overrides. Returns the updated LiveWidget.",
  params: Type.Object({ liveWidgetId: LiveWidgetIdParam }, { additionalProperties: false }),
  result: BoardLiveWidgetResult,
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
  result: BoardResult,
})

const boardListLiveCardsAction = defineActionContract({
  name: "board.listLiveCards",
  kind: "query",
  description: "List the LiveCards in a Board's Now Layer in display order. Entries carry only patch overrides; the display title resolves as patch.metadata.title ?? source.metadata.title ?? provider.title.",
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

const nowLayerGetLiveCardsAction = defineActionContract({
  name: "nowLayer.getLiveCards",
  kind: "query",
  description: "List the LiveCards in one Board's Now Layer.",
  params: Type.Object({ boardId: BoardIdParam }, { additionalProperties: false }),
  result: Type.Array(NowLayerLiveCardResult),
})

const ApplicationDataSchema = Type.Unsafe<ApplicationData>(Type.Object({
  boards: Type.Array(BoardResult),
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
  nextLayerSetManualOrderAction,
  liveWidgetCreateAction,
  boardListLiveWidgetsAction,
  liveWidgetDeleteAction,
  liveWidgetMoveAction,
  liveWidgetSetLayoutsAction,
  liveWidgetConfigureAction,
  liveWidgetGetAction,
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
  liveWidgetListAction,
  nowLayerGetLiveCardsAction,
  applicationReplaceAction,
] as const
