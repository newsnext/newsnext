import { browser } from "#imports"
import { createSettingsOpenRequest } from "./settings/open-request"

async function findAppTab(appUrl: string) {
  const appTabs = await browser.tabs.query({ url: `${appUrl}*` })
  return appTabs.find(tab => tab.active) ?? appTabs[0]
}

async function focusAppTab(tab: { id: number, windowId: number }): Promise<void> {
  await browser.tabs.update(tab.id, { active: true })
  await browser.windows.update(tab.windowId, { focused: true })
}

async function openOrFocusAppTab(appUrl: string, newTabUrl: string): Promise<"created" | "focused"> {
  const existing = await findAppTab(appUrl)
  if (existing?.id === undefined) {
    await browser.tabs.create({ url: newTabUrl })
    return "created"
  }
  await focusAppTab({ id: existing.id, windowId: existing.windowId })
  return "focused"
}

export async function openAppTab(): Promise<void> {
  const appUrl = browser.runtime.getURL("/app.html")
  await openOrFocusAppTab(appUrl, appUrl)
}

export async function openAppBoard(boardId: string): Promise<void> {
  const appUrl = browser.runtime.getURL("/app.html")
  await openOrFocusAppTab(appUrl, `${appUrl}#/board/${encodeURIComponent(boardId)}`)
}

export async function openAppSettings(): Promise<void> {
  const appUrl = browser.runtime.getURL("/app.html")
  const settingsUrl = new URL(appUrl)
  settingsUrl.searchParams.set("settings", "cli")
  if (await openOrFocusAppTab(appUrl, settingsUrl.toString()) === "focused") {
    await browser.runtime.sendMessage(createSettingsOpenRequest("cli"))
  }
}
