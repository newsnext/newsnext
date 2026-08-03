const OPEN_SETTINGS_INTENT_KEY = "newsnext-open-settings"

export function requestSettingsOpen(): void {
  sessionStorage.setItem(OPEN_SETTINGS_INTENT_KEY, "true")
}

export function consumeSettingsOpenRequest(): boolean {
  const shouldOpen = sessionStorage.getItem(OPEN_SETTINGS_INTENT_KEY) === "true"
  sessionStorage.removeItem(OPEN_SETTINGS_INTENT_KEY)
  return shouldOpen
}
