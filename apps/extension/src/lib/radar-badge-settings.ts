import { browser } from "#imports"

export const RADAR_BADGE_ENABLED_KEY = "newsnext-radar-badge-enabled"

async function isRadarBadgeEnabled(): Promise<boolean> {
  const stored = await browser.storage.local.get(RADAR_BADGE_ENABLED_KEY).catch(() => undefined)
  return stored?.[RADAR_BADGE_ENABLED_KEY] === true
}

async function hasRadarBadgePermission(): Promise<boolean> {
  return browser.permissions.contains({ permissions: ["tabs"] }).catch(() => false)
}

export async function isRadarBadgeActive(): Promise<boolean> {
  const [enabled, permissionGranted] = await Promise.all([
    isRadarBadgeEnabled(),
    hasRadarBadgePermission(),
  ])
  return enabled && permissionGranted
}

export async function enableRadarBadge(): Promise<boolean> {
  const granted = await browser.permissions.request({ permissions: ["tabs"] }).catch(() => false)
  if (!granted) {
    return false
  }

  await browser.storage.local.set({ [RADAR_BADGE_ENABLED_KEY]: true })
  return true
}

export async function clearRadarBadges(): Promise<void> {
  const tabs = await browser.tabs.query({}).catch(() => [])
  await Promise.all(tabs.map((tab) => {
    return tab.id === undefined
      ? Promise.resolve()
      : browser.action.setBadgeText({ tabId: tab.id, text: "" }).catch(() => undefined)
  }))
}

export async function disableRadarBadge(): Promise<void> {
  await clearRadarBadges()
  await browser.storage.local.set({ [RADAR_BADGE_ENABLED_KEY]: false })
  await browser.permissions.remove({ permissions: ["tabs"] }).catch(() => false)
}
