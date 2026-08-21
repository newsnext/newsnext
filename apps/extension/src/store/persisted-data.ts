import type { PersistedUserData } from "@/lib/settings"
import { atom } from "jotai"
import { actions } from "@/lib/actions"
import { createInitialApplicationData } from "@/lib/application"
import {
  createDefaultPersistedDeviceState,
  createDefaultPersistedSettings,
  mergePersistedUserData,
} from "@/lib/settings"
import { applicationDataAtom } from "./board"
import { persistedDeviceStateAtom, persistedSettingsAtom } from "./settings"

export const persistedUserDataAtom = atom<PersistedUserData>(get => ({
  settings: get(persistedSettingsAtom),
  ...get(applicationDataAtom),
}))

export const importPersistedUserDataAtom = atom(
  null,
  async (get, set, imported: Partial<PersistedUserData>) => {
    const data = mergePersistedUserData(get(persistedUserDataAtom), imported)
    await actions.application.replace({
      version: data.version,
      boards: data.boards,
      instances: data.instances,
    })
    set(persistedSettingsAtom, data.settings)
    return data
  },
)

export const clearPersistedUserDataAtom = atom(null, async (_get, set) => {
  const data = createInitialApplicationData()
  const boardId = data.boards[0]?.id
  if (!boardId) throw new Error("NewsNext must keep at least one Board")
  await actions.application.replace(data)
  set(persistedSettingsAtom, createDefaultPersistedSettings(boardId))
  set(persistedDeviceStateAtom, createDefaultPersistedDeviceState(boardId))
  return data
})
