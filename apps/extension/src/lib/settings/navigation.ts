import type { SettingsTabId } from "./persisted-settings"
import { browser } from "#imports"
import { openAppTab } from "../app-tab"
import { isSettingsOpenRequest } from "./open-request"
import { isSettingsTabId } from "./persisted-settings"

const OPEN_SETTINGS_INTENT_KEY = "newsnext-open-settings"
const OPEN_SETTINGS_QUERY_PARAM = "settings"

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

  const url = new URL(window.location.href)
  const requestedTab = url.searchParams.get(OPEN_SETTINGS_QUERY_PARAM)
  if (!isSettingsTabId(requestedTab)) return undefined

  url.searchParams.delete(OPEN_SETTINGS_QUERY_PARAM)
  window.history.replaceState(window.history.state, "", url)
  return requestedTab
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
  const handleMessage = (message: unknown): void => {
    if (isSettingsOpenRequest(message)) openRequestedTab(message.tab)
  }
  window.addEventListener("storage", handleStorage)
  browser.runtime.onMessage.addListener(handleMessage)
  return () => {
    window.removeEventListener("storage", handleStorage)
    browser.runtime.onMessage.removeListener(handleMessage)
  }
}
