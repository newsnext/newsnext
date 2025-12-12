import { browser, defineBackground } from "#imports"
import { registerCommandBarService } from "../services"
import { sendMessage } from "../services/message"

export function currentTab() {
  return new Promise<number>((resolve) => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      resolve(tabs[0].id!)
    })
  })
}

export default defineBackground(() => {
  browser.commands.onCommand.addListener((command) => {
    if (command === "command-bar-toggle") {
      currentTab().then((tabId) => {
        sendMessage("command-bar-toggle", { }, tabId)
      })
    }
  })
  registerCommandBarService()
})