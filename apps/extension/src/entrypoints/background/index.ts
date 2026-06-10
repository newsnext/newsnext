import { browser, defineBackground } from "#imports"
import { sendMessage } from "#/messaging/command-bar"
import { registerCommandBarService } from "#/services/command-bar"

export async function getCurrentTabId(): Promise<number | undefined> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  return tab?.id
}

export default defineBackground(() => {
  browser.commands.onCommand.addListener((command) => {
    if (command === "command-bar-toggle") {
      getCurrentTabId().then((tabId) => {
        if (tabId !== undefined) {
          sendMessage("command-bar-toggle", {}, tabId)
        }
      })
    }
  })

  registerCommandBarService()
})
