import type { LiveCard } from "../../source/live-cards"
import type { SourceLoadResponse } from "../../source/load-result"
import type { BackgroundActionContext } from "../background-actions"
import type { RequireNativeConnection } from "./types"
import { getApplicationLiveCards } from "../../application"
import { isSourceLoadResponse } from "../../source/load-result"
import { readApplicationData } from "../application-service"
import { nativeRpc } from "./rpc"
import { runtime } from "./state"

export async function loadRoutedLiveCard(
  input: { cardId: string },
  requireConnection: RequireNativeConnection,
  actionContext: BackgroundActionContext,
): Promise<SourceLoadResponse> {
  const result = await routeLiveCardRequest(input, false, requireConnection, actionContext)
  if (!result) throw new Error("The NewsNext Worker returned an empty Source result")
  return result
}

export async function readRoutedLiveCardSnapshot(
  input: { cardId: string },
  requireConnection: RequireNativeConnection,
  actionContext: BackgroundActionContext,
): Promise<SourceLoadResponse | null> {
  return await routeLiveCardRequest(input, true, requireConnection, actionContext)
}

async function routeLiveCardRequest(
  input: { cardId: string },
  snapshotOnly: boolean,
  requireConnection: RequireNativeConnection,
  actionContext: BackgroundActionContext,
): Promise<SourceLoadResponse | null> {
  // Local cards execute in this browser so the response never waits on the
  // daemon. The daemon only receives a fire-and-forget observation for history.
  if (!runtime.enabled || runtime.localCardIds.has(input.cardId)) {
    const result = await executeLocal(input, snapshotOnly, actionContext)
    if (!snapshotOnly && result) notifyObserved(input.cardId, result, requireConnection)
    return result
  }
  const connection = await requireConnection()
  const result = await nativeRpc(connection).request("liveCardSnapshotGet", { cardId: input.cardId, snapshotOnly })
  if (result === null && snapshotOnly) return null
  if (!isSourceLoadResponse(result)) throw new Error("The NewsNext Worker returned an invalid Source result")
  return result
}

/**
 * Report a locally executed load to the daemon without delaying the caller.
 * History is unavailable when the daemon is unreachable; failures are ignored.
 */
function notifyObserved(
  cardId: string,
  result: SourceLoadResponse,
  requireConnection: RequireNativeConnection,
): void {
  if (!runtime.enabled) return
  void (async () => {
    try {
      const connection = await requireConnection()
      await nativeRpc(connection).request("liveCardObserved", { cardId, result })
    } catch {
      // History stays unavailable; the fresh response was already returned.
    }
  })()
}

async function executeLocal(
  input: { cardId: string },
  snapshotOnly: boolean,
  actionContext: BackgroundActionContext,
): Promise<SourceLoadResponse | null> {
  const liveCards = runtime.enabled
    ? runtime.workspace.liveCards
    : getApplicationLiveCards(await readApplicationData())
  const card = liveCards.find(candidate => candidate.cardId === input.cardId)
  if (!card) throw new Error(`LiveCard '${input.cardId}' not found`)
  if (card.workerId !== runtime.workerId) {
    throw new Error("The LiveCard's NewsNext Worker is not connected")
  }
  const result = snapshotOnly
    ? await actionContext.loader.readLiveCardSnapshot({ card: card as LiveCard })
    : await actionContext.loader.loadLiveCard({ card: card as LiveCard })
  if (result === null && snapshotOnly) return null
  if (!isSourceLoadResponse(result)) {
    throw new Error("The current browser returned an invalid Source result")
  }
  return result
}
