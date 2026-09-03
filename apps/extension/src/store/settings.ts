import type { LocalePreference } from "@/lib/i18n/locale"
import type {
  LiveCardHeight,
  PersistedDeviceState,
  PersistedSettings,
  SettingsTabId,
  ShortcutSettings,
} from "@/lib/settings"
import type { SourceIconSettings } from "@/lib/source"
import type { ThemeMode } from "@/lib/utils/swith-theme"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { createDefaultPersistedDeviceState, createDefaultPersistedSettings, normalizePersistedDeviceState, normalizePersistedSettings, PERSISTED_DATA_SLICES } from "@/lib/settings"
import { handleThemeModeSwitch, THEME_MODE_KEY } from "@/lib/utils/swith-theme"
import { createExtensionStorage, createLocalStorage } from "./persisted-storage"

type SettingsValueUpdate<Value> = Value | ((current: Value) => Value)

const persistedSettingsStorageOptions = {
  defaultValue: createDefaultPersistedSettings,
  key: PERSISTED_DATA_SLICES.settings.key,
  normalize: normalizePersistedSettings,
  onValue: (settings: PersistedSettings) => {
    const themeMode = settings.appearance.themeMode
    if (localStorage.getItem(THEME_MODE_KEY) !== themeMode) {
      localStorage.setItem(THEME_MODE_KEY, themeMode)
    }
    handleThemeModeSwitch(themeMode)
  },
}

const persistedDeviceStateStorageOptions = {
  defaultValue: createDefaultPersistedDeviceState,
  key: PERSISTED_DATA_SLICES.deviceState.key,
  normalize: normalizePersistedDeviceState,
}

const deviceStateStorage = createLocalStorage(persistedDeviceStateStorageOptions)
const settingsStorage = createExtensionStorage(persistedSettingsStorageOptions)

export const persistedSettingsAtom = atomWithStorage<PersistedSettings>(
  PERSISTED_DATA_SLICES.settings.key,
  createDefaultPersistedSettings(),
  settingsStorage,
  { getOnInit: true },
)

export const persistedDeviceStateAtom = atomWithStorage<PersistedDeviceState>(
  PERSISTED_DATA_SLICES.deviceState.key,
  createDefaultPersistedDeviceState(),
  deviceStateStorage,
  { getOnInit: true },
)

export async function initializeSettingsStorage(): Promise<void> {
  await settingsStorage.initialize()
}

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

export const liveCardHeightAtom = atom(
  get => get(persistedSettingsAtom).appearance.liveCardHeight,
  (get, set, liveCardHeight: LiveCardHeight) => {
    const settings = get(persistedSettingsAtom)
    set(persistedSettingsAtom, {
      ...settings,
      appearance: { ...settings.appearance, liveCardHeight },
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

export const registryUrlsAtom = atom(
  get => get(persistedSettingsAtom).general.registryUrls,
  (get, set, update: SettingsValueUpdate<string[]>) => {
    const settings = get(persistedSettingsAtom)
    const registryUrls = typeof update === "function"
      ? update(settings.general.registryUrls)
      : update
    set(persistedSettingsAtom, {
      ...settings,
      general: { ...settings.general, registryUrls },
    })
  },
)

export const shortcutSettingsAtom = atom(
  get => get(persistedSettingsAtom).shortcuts,
  (get, set, update: SettingsValueUpdate<ShortcutSettings>) => {
    const settings = get(persistedSettingsAtom)
    const shortcuts = typeof update === "function"
      ? update(settings.shortcuts)
      : update
    set(persistedSettingsAtom, { ...settings, shortcuts })
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

export const localePreferenceAtom = atom(
  get => get(persistedSettingsAtom).appearance.localePreference,
  (get, set, localePreference: LocalePreference) => {
    const settings = get(persistedSettingsAtom)
    set(persistedSettingsAtom, {
      ...settings,
      appearance: { ...settings.appearance, localePreference },
    })
  },
)

export const settingsTabAtom = atom(
  get => get(persistedDeviceStateAtom).settingsTab,
  (get, set, settingsTab: SettingsTabId) => {
    const state = get(persistedDeviceStateAtom)
    set(persistedDeviceStateAtom, { ...state, settingsTab })
  },
)
