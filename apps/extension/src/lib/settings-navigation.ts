import type { SettingsTabId } from "./persisted-settings"
import { isSettingsTabId } from "./persisted-settings"

const OPEN_SETTINGS_INTENT_KEY = "newsnext-open-settings"
const OPEN_SETTINGS_EVENT = "newsnext:open-settings"

export function requestSettingsOpen(tab: SettingsTabId = "appearance"): void {
  localStorage.setItem(OPEN_SETTINGS_INTENT_KEY, tab)
  window.dispatchEvent(new CustomEvent<SettingsTabId>(OPEN_SETTINGS_EVENT, { detail: tab }))
}

export function consumeSettingsOpenRequest(): SettingsTabId | undefined {
  const tab = localStorage.getItem(OPEN_SETTINGS_INTENT_KEY)
  localStorage.removeItem(OPEN_SETTINGS_INTENT_KEY)
  return isSettingsTabId(tab) ? tab : undefined
}

export function ensureSettingsOpenRequest(tab: SettingsTabId = "appearance"): void {
  if (!isSettingsTabId(localStorage.getItem(OPEN_SETTINGS_INTENT_KEY))) {
    requestSettingsOpen(tab)
  }
}

export function subscribeToSettingsOpenRequests(
  listener: (tab: SettingsTabId) => void,
): () => void {
  const handleRequest = (event: Event): void => {
    if (event instanceof CustomEvent && isSettingsTabId(event.detail)) {
      localStorage.removeItem(OPEN_SETTINGS_INTENT_KEY)
      listener(event.detail)
    }
  }
  window.addEventListener(OPEN_SETTINGS_EVENT, handleRequest)
  return () => window.removeEventListener(OPEN_SETTINGS_EVENT, handleRequest)
}
