import type { SettingsTabId } from "./persisted-settings"
import { openAppTab } from "../app-tab"
import { isSettingsTabId } from "./persisted-settings"

const OPEN_SETTINGS_INTENT_KEY = "newsnext-open-settings"

function requestSettingsOpen(tab: SettingsTabId): void {
  localStorage.setItem(OPEN_SETTINGS_INTENT_KEY, tab)
}

export async function openSettings(tab: SettingsTabId = "appearance"): Promise<void> {
  requestSettingsOpen(tab)
  await openAppTab()
}

export function consumeSettingsOpenRequest(): SettingsTabId | undefined {
  const storedTab = localStorage.getItem(OPEN_SETTINGS_INTENT_KEY)
  localStorage.removeItem(OPEN_SETTINGS_INTENT_KEY)
  if (isSettingsTabId(storedTab)) return storedTab
}

export function subscribeToSettingsOpenRequests(
  listener: (tab: SettingsTabId) => void,
): () => void {
  const openRequestedTab = (tab: unknown): void => {
    if (!isSettingsTabId(tab)) {
      return
    }

    localStorage.removeItem(OPEN_SETTINGS_INTENT_KEY)
    listener(tab)
  }
  const handleStorage = (event: StorageEvent): void => {
    if (event.storageArea === localStorage && event.key === OPEN_SETTINGS_INTENT_KEY) {
      openRequestedTab(event.newValue)
    }
  }
  window.addEventListener("storage", handleStorage)
  return () => window.removeEventListener("storage", handleStorage)
}
