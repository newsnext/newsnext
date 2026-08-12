import type { BoardListResult } from "./board-list-data"
import { browser } from "#imports"
import {
  normalizeBoards,
  normalizeSourceInstances,
  PERSISTED_DATA_SLICES,
} from "../settings"
import { groupInstancesByBoard } from "./board-list-data"

export async function listConnectedBoards(): Promise<BoardListResult> {
  const stored = await browser.storage.local.get([
    PERSISTED_DATA_SLICES.boards.key,
    PERSISTED_DATA_SLICES.instances.key,
  ])
  return groupInstancesByBoard(
    normalizeBoards(stored[PERSISTED_DATA_SLICES.boards.key]),
    normalizeSourceInstances(stored[PERSISTED_DATA_SLICES.instances.key]),
  )
}
