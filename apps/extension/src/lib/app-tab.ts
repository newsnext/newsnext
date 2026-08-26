import { browser } from "#imports"

async function findAppTab(appUrl: string) {
  const appTabs = await browser.tabs.query({ url: `${appUrl}*` })
  return appTabs.find(tab => tab.active) ?? appTabs[0]
}

async function focusAppTab(tab: { id: number, windowId: number }): Promise<void> {
  await browser.tabs.update(tab.id, { active: true })
  await browser.windows.update(tab.windowId, { focused: true })
}

async function openOrFocusAppTab(appUrl: string): Promise<void> {
  const existing = await findAppTab(appUrl)
  if (existing?.id === undefined) {
    await browser.tabs.create({ url: appUrl })
    return
  }
  await focusAppTab({ id: existing.id, windowId: existing.windowId })
}

export async function openAppTab(): Promise<void> {
  const appUrl = browser.runtime.getURL("/app.html")
  await openOrFocusAppTab(appUrl)
}
