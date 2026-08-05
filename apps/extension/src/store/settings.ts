import type {
  PersistedDeviceState,
  PersistedSettings,
  SettingsTabId,
} from "@/lib/persisted-settings"
import type { SourceIconSettings } from "@/lib/source-icon"
import type { ThemeMode } from "@/lib/utils/swith-theme"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { PERSISTED_DATA_SLICES } from "@/lib/persisted-data"
import {
  createDefaultPersistedDeviceState,
  createDefaultPersistedSettings,
  normalizePersistedDeviceState,
  normalizePersistedSettings,
} from "@/lib/persisted-settings"
import { createMirroredStorage, readCachedValue } from "./persisted-storage"

type SettingsValueUpdate<Value> = Value | ((current: Value) => Value)

const persistedSettingsStorageOptions = {
  defaultValue: createDefaultPersistedSettings,
  key: PERSISTED_DATA_SLICES.settings.key,
  normalize: normalizePersistedSettings,
}

const persistedDeviceStateStorageOptions = {
  defaultValue: createDefaultPersistedDeviceState,
  key: PERSISTED_DATA_SLICES.deviceState.key,
  normalize: normalizePersistedDeviceState,
}

export const persistedSettingsAtom = atomWithStorage<PersistedSettings>(
  PERSISTED_DATA_SLICES.settings.key,
  createDefaultPersistedSettings(),
  createMirroredStorage(persistedSettingsStorageOptions),
  { getOnInit: true },
)

export const persistedDeviceStateAtom = atomWithStorage<PersistedDeviceState>(
  PERSISTED_DATA_SLICES.deviceState.key,
  createDefaultPersistedDeviceState(),
  createMirroredStorage(persistedDeviceStateStorageOptions),
  { getOnInit: true },
)

export const themeModeAtom = atom(
  get => get(persistedSettingsAtom).appearance.themeMode,
  (get, set, themeMode: ThemeMode) => {
    const settings = get(persistedSettingsAtom)
    set(persistedSettingsAtom, {
      ...settings,
      appearance: { ...settings.appearance, themeMode },
    })
  },
)

export const backgroundArtworkAtom = atom(
  get => get(persistedSettingsAtom).appearance.backgroundArtwork,
  (get, set, backgroundArtwork: string | null) => {
    const settings = get(persistedSettingsAtom)
    set(persistedSettingsAtom, {
      ...settings,
      appearance: { ...settings.appearance, backgroundArtwork },
    })
  },
)

export const backgroundArtworkOpacityAtom = atom(
  get => get(persistedSettingsAtom).appearance.backgroundArtworkOpacity,
  (get, set, backgroundArtworkOpacity: number) => {
    const settings = get(persistedSettingsAtom)
    set(persistedSettingsAtom, {
      ...settings,
      appearance: { ...settings.appearance, backgroundArtworkOpacity },
    })
  },
)

export const defaultBoardIdAtom = atom(
  get => get(persistedSettingsAtom).general.defaultBoardId,
  (get, set, update: SettingsValueUpdate<string | null>) => {
    const settings = get(persistedSettingsAtom)
    const defaultBoardId = typeof update === "function"
      ? update(settings.general.defaultBoardId)
      : update
    set(persistedSettingsAtom, {
      ...settings,
      general: { ...settings.general, defaultBoardId },
    })
  },
)

export const sourceIconSettingsAtom = atom(
  get => get(persistedSettingsAtom).general.sourceIcon,
  (get, set, sourceIcon: SourceIconSettings) => {
    const settings = get(persistedSettingsAtom)
    set(persistedSettingsAtom, {
      ...settings,
      general: { ...settings.general, sourceIcon },
    })
  },
)

export const currentBoardIdAtom = atom(
  get => get(persistedDeviceStateAtom).currentBoardId,
  (get, set, update: SettingsValueUpdate<string>) => {
    const state = get(persistedDeviceStateAtom)
    const currentBoardId = typeof update === "function"
      ? update(state.currentBoardId)
      : update
    set(persistedDeviceStateAtom, { ...state, currentBoardId })
  },
)

export const settingsTabAtom = atom(
  get => get(persistedDeviceStateAtom).settingsTab,
  (get, set, settingsTab: SettingsTabId) => {
    const state = get(persistedDeviceStateAtom)
    set(persistedDeviceStateAtom, { ...state, settingsTab })
  },
)

export function readCachedPersistedSettings(): PersistedSettings {
  return readCachedValue(persistedSettingsStorageOptions)
}
