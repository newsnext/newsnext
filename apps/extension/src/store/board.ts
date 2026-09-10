import type { ApplicationData } from "../lib/application"
import type { Board, BoardCreateInput } from "../lib/board"
import type { OpmlImport } from "../lib/opml"
import type { LiveCardPatch } from "../lib/source"
import { atom } from "jotai"
import { atomWithStorage, selectAtom, splitAtom } from "jotai/utils"
import { actions } from "../lib/actions"
import {
  DEFAULT_BOARD_LAYER,
  DEFAULT_NOW_LAYER_SORT,
} from "../lib/board"
import { normalizeApplicationData, PERSISTED_DATA_SLICES } from "../lib/settings"
import { createExtensionStorage } from "./persisted-storage"
import { currentBoardIdAtom } from "./settings"

const applicationDataStorage = createExtensionStorage({
  defaultValue: () => normalizeApplicationData(undefined),
  key: PERSISTED_DATA_SLICES.application.key,
  normalize: normalizeApplicationData,
  readOnly: true,
})

const persistedApplicationDataAtom = atomWithStorage<ApplicationData>(
  PERSISTED_DATA_SLICES.application.key,
  normalizeApplicationData(undefined),
  applicationDataStorage,
  { getOnInit: true },
)
export const applicationDataAtom = atom(get => get(persistedApplicationDataAtom))

export async function initializeApplicationDataStorage(): Promise<void> {
  await applicationDataStorage.initialize()
}

export const boardsAtom = selectAtom(applicationDataAtom, data => data.boards)
export const currentBoardAtom = atom((get) => {
  const currentBoardId = get(currentBoardIdAtom)
  return get(boardsAtom).find(board => board.id === currentBoardId)
})
export const liveCardsAtom = selectAtom(applicationDataAtom, data => data.liveCards)
export const liveCardAtomsAtom = splitAtom(liveCardsAtom, card => card.cardId)

export const setNowLayerManualOrderAtom = atom(null, async (_get, _set, input: {
  boardId: string
  cardIds: string[]
}) => {
  await actions.nowLayer.setManualOrder({
    boardId: input.boardId,
    cardIds: input.cardIds,
  })
})

export const createLiveCardAtom = atom(null, (_get, _set, input: {
  boardId: string
  patch: LiveCardPatch
  sourceId: string
}) => actions.liveCard.create(input))

export const setLiveCardPatchAtom = atom(null, (_get, _set, input: {
  cardId: string
  patch: LiveCardPatch
}) => actions.liveCard.configure(input))

export const deleteLiveCardAtom = atom(null, (_get, _set, cardId: string) => (
  actions.liveCard.delete({ cardId })
))

export const createBoardAtom = atom(null, (_get, _set, input: BoardCreateInput) => (
  actions.board.create({
    color: input.color,
    defaultLayer: input.defaultLayer,
    name: input.name,
    sortMode: input.sortMode,
  })
))

export const createBoardFromOpmlAtom = atom(null, (_get, _set, input: OpmlImport) => (
  actions.board.create({
    liveCards: input.feeds.map(feed => ({
      sourceId: "rss:feed",
      patch: {
        params: { url: feed.url },
        ...(feed.title ? { metadata: { title: feed.title } } : {}),
      },
    })),
    color: "orange",
    defaultLayer: DEFAULT_BOARD_LAYER,
    name: input.title,
    sortMode: DEFAULT_NOW_LAYER_SORT.mode,
  })
))

export const updateBoardAtom = atom(null, async (_get, _set, board: Board) => {
  await actions.board.update({
    boardId: board.id,
    color: board.color,
    defaultLayer: board.defaultLayer,
    name: board.name,
    sortMode: board.nowLayer.sort.mode,
  })
})

type DeleteBoardInput
  = | { boardId: string, mode: "delete" }
    | { boardId: string, mode: "transfer", targetBoardId: string }

export const deleteBoardAtom = atom(null, (_get, _set, input: DeleteBoardInput) => (
  input.mode === "delete"
    ? actions.board.delete({ boardId: input.boardId, deleteLiveCards: true })
    : actions.board.delete({ boardId: input.boardId, targetBoardId: input.targetBoardId })
))

export const moveLiveCardAtom = atom(null, (_get, _set, input: {
  boardId: string
  cardId: string
}) => actions.liveCard.move(input))

export const resetLiveCardParamsAtom = atom(null, (get, _set, cardId: string) => {
  const card = get(liveCardsAtom).find(candidate => candidate.cardId === cardId)
  if (!card || Object.keys(card.patch.params ?? {}).length === 0) return
  return actions.liveCard.resetParams({ cardId })
})
