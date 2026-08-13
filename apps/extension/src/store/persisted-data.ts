import type { PersistedUserData } from "@/lib/settings"
import { atom } from "jotai"
import { createEmptyApplicationData } from "@/lib/application"
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
      collections: data.collections,
      collectionEntries: data.collectionEntries,
      collectionViews: data.collectionViews,
      instances: data.instances,
    })
    set(persistedSettingsAtom, data.settings)
  },
)

export const clearPersistedUserDataAtom = atom(null, async (_get, set) => {
  await createBackgroundClient().application.replace(createEmptyApplicationData())
  set(persistedSettingsAtom, createDefaultPersistedSettings())
  set(persistedDeviceStateAtom, createDefaultPersistedDeviceState())
})
