import type { PersistedUserData } from "@/lib/settings"
import { atom } from "jotai"
import { ALL_BOARD_ID } from "@/lib/board"
import {
  createDefaultPersistedDeviceState,
  createDefaultPersistedSettings,
  mergePersistedUserData,
} from "@/lib/settings"
import {
  boardsAtom,
  instancesAtom,
} from "./board"
import {
  currentBoardIdAtom,
  persistedDeviceStateAtom,
  persistedSettingsAtom,
} from "./settings"

export const persistedUserDataAtom = atom<PersistedUserData>(get => ({
  settings: get(persistedSettingsAtom),
  boards: get(boardsAtom).filter(board => board.id !== ALL_BOARD_ID),
  instances: get(instancesAtom),
}))

export const importPersistedUserDataAtom = atom(
  null,
  (get, set, imported: Partial<PersistedUserData>) => {
    const data = mergePersistedUserData(get(persistedUserDataAtom), imported)
    set(persistedSettingsAtom, data.settings)
    set(boardsAtom, data.boards)
    set(instancesAtom, data.instances)

    const boardIds = new Set(data.boards.map(board => board.id))
    if (!boardIds.has(get(currentBoardIdAtom))) {
      set(currentBoardIdAtom, ALL_BOARD_ID)
    }
  },
)

export const clearPersistedUserDataAtom = atom(null, (_get, set) => {
  set(persistedSettingsAtom, createDefaultPersistedSettings())
  set(persistedDeviceStateAtom, createDefaultPersistedDeviceState())
  set(boardsAtom, [])
  set(instancesAtom, [])
})
