import type { Browser } from "#imports"
import { browser } from "#imports"
import { TOGGLE_RADAR_OVERLAY_MESSAGE } from "@/lib/radar-overlay-message"

const RADAR_TRIGGER_SCRIPT = "/content-scripts/radar-trigger.js"

export async function toggleRadarOverlay(
  tab: Pick<Browser.tabs.Tab, "id">,
  manifestVersion: 2 | 3 = import.meta.env.MANIFEST_VERSION,
): Promise<void> {
  if (!tab.id) {
    return
  }

  const message = { type: TOGGLE_RADAR_OVERLAY_MESSAGE }
  const toggledExistingOverlay = await browser.tabs.sendMessage(tab.id, message)
    .then(() => true)
    .catch(() => false)

  if (toggledExistingOverlay) {
    return
  }

  if (manifestVersion === 3) {
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: [RADAR_TRIGGER_SCRIPT],
    })
  } else {
    await browser.tabs.executeScript(tab.id, {
      file: RADAR_TRIGGER_SCRIPT,
    })
  }

  await browser.tabs.sendMessage(tab.id, message)
}
