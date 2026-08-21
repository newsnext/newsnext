import type { PersistedUserData } from "@/lib/settings"
import { atom } from "jotai"
import { createInitialApplicationData } from "@/lib/application"
import { createBackgroundClient } from "@/lib/background"
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
    await createBackgroundClient().application.replace({
      version: data.version,
      collections: data.collections,
      instances: data.instances,
    })
    set(persistedSettingsAtom, data.settings)
    return data
  },
)

export const clearPersistedUserDataAtom = atom(null, async (_get, set) => {
  const data = createInitialApplicationData()
  const boardId = data.collections[0]?.id
  if (!boardId) throw new Error("NewsNext must keep at least one Board")
  await createBackgroundClient().application.replace(data)
  set(persistedSettingsAtom, createDefaultPersistedSettings(boardId))
  set(persistedDeviceStateAtom, createDefaultPersistedDeviceState(boardId))
  return data
})
