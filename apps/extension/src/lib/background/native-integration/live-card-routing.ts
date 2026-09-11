import type { SourceLoadResponse } from "../../source/load-result"
import type { BackgroundActionContext } from "../background-actions"
import type { RequireNativeConnection } from "./types"
import { createId } from "@/lib/id"
import { isSourceLoadResponse } from "../../source/load-result"
import { executeRegisteredAction } from "../action-registry"
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

export async function readRoutedLiveCardCache(
  input: { cardId: string },
  requireConnection: RequireNativeConnection,
  actionContext: BackgroundActionContext,
): Promise<SourceLoadResponse | null> {
  return await routeLiveCardRequest(input, true, requireConnection, actionContext)
}

async function routeLiveCardRequest(
  input: { cardId: string },
  cacheOnly: boolean,
  requireConnection: RequireNativeConnection,
  actionContext: BackgroundActionContext,
): Promise<SourceLoadResponse | null> {
  if (!runtime.enabled || runtime.localCardIds.has(input.cardId)) {
    const application = !runtime.enabled ? await readApplicationData() : runtime.workspace
    const card = application.liveCards.find(candidate => candidate.cardId === input.cardId)
    if (!card) throw new Error(`LiveCard '${input.cardId}' not found`)
    if (card.workerId !== runtime.workerId) {
      throw new Error("The LiveCard's NewsNext Worker is not connected")
    }
    const result = await executeRegisteredAction(
      cacheOnly ? "loader.readLiveCardCache" : "loader.loadLiveCard",
      { card },
      "connected",
      actionContext,
      createId(),
    )
    if (result === null && cacheOnly) return null
    if (!isSourceLoadResponse(result)) {
      throw new Error("The current browser returned an invalid Source result")
    }
    return result
  }
  const connection = await requireConnection()
  const result = await nativeRpc(connection).request("liveCardGet", { cardId: input.cardId, cacheOnly })
  if (result === null && cacheOnly) return null
  if (!isSourceLoadResponse(result)) throw new Error("The NewsNext Worker returned an invalid Source result")
  return result
}
