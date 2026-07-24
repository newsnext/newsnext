import type { Browser } from "#imports"
import { browser } from "#imports"
import { createRadarMatcher } from "@/lib/radar"
import {
  clearRadarBadges,
  isRadarBadgeActive,
  RADAR_BADGE_ENABLED_KEY,
} from "@/lib/radar-badge-settings"
import { getSourceDescriptors } from "@/lib/sources"

const radarMatcher = createRadarMatcher(getSourceDescriptors())

async function updateRadarBadge(tab: Browser.tabs.Tab, enabled: boolean): Promise<void> {
  if (tab.id === undefined) {
    return
  }

  const count = enabled && tab.url
    ? radarMatcher.getSuggestions({ url: tab.url, title: tab.title }).length
    : 0

  await browser.action.setBadgeText({
    tabId: tab.id,
    text: count > 0 ? String(count) : "",
  })

  if (count > 0) {
    await browser.action.setBadgeBackgroundColor({
      tabId: tab.id,
      color: "#ef4444",
    })
  }
}

export function registerRadarBadge(): void {
  let enabled = false

  const updateActiveRadarBadge = async (): Promise<void> => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    await Promise.all(tabs.map(tab => updateRadarBadge(tab, enabled)))
  }

  const syncState = async (): Promise<void> => {
    enabled = await isRadarBadgeActive()

    if (enabled) {
      await updateActiveRadarBadge()
    } else {
      await clearRadarBadges()
    }
  }

  void syncState()

  browser.tabs.onActivated.addListener(() => {
    void updateActiveRadarBadge()
  })
  browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (!changeInfo.url && !changeInfo.title) {
      return
    }

    void updateRadarBadge(tab, enabled)
  })
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && RADAR_BADGE_ENABLED_KEY in changes) {
      void syncState()
    }
  })
  browser.permissions.onAdded.addListener((permissions) => {
    if (permissions.permissions?.includes("tabs")) {
      void syncState()
    }
  })
  browser.permissions.onRemoved.addListener((permissions) => {
    if (permissions.permissions?.includes("tabs")) {
      void syncState()
    }
  })
}
