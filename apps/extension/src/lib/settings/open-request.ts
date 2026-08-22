import type { SettingsTabId } from "./persisted-settings"
import { isSettingsTabId } from "./persisted-settings"

const SETTINGS_OPEN_REQUEST_TYPE = "settings.open"

export interface SettingsOpenRequest {
  tab: SettingsTabId
  type: typeof SETTINGS_OPEN_REQUEST_TYPE
}

export function createSettingsOpenRequest(tab: SettingsTabId): SettingsOpenRequest {
  return { tab, type: SETTINGS_OPEN_REQUEST_TYPE }
}

export function isSettingsOpenRequest(value: unknown): value is SettingsOpenRequest {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Partial<SettingsOpenRequest>
  return candidate.type === SETTINGS_OPEN_REQUEST_TYPE && isSettingsTabId(candidate.tab)
}
