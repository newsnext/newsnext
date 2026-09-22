import type { ApplicationData } from "../../application"
import type { Workspace as NativeWorkspace } from "@/lib/native-protocol/Workspace"
import { getApplicationLiveCards } from "../../application"
import { normalizeApplicationData } from "../../settings/persisted-data"

type NativeWorkspaceData = Pick<NativeWorkspace, "boards" | "liveCards">

export function toNativeWorkspaceData(data: ApplicationData): NativeWorkspaceData {
  return {
    boards: data.boards.map(board => ({
      ...board,
      nowLayer: {
        liveCards: board.nowLayer.liveCards.map(card => card.cardId),
      },
    })),
    liveCards: getApplicationLiveCards(data),
  }
}

export function fromNativeWorkspaceData(data: NativeWorkspaceData): ApplicationData {
  return normalizeApplicationData({
    version: 8,
    boards: data.boards,
    liveCards: data.liveCards,
  })
}
