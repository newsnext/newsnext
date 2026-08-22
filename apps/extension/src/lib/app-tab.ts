import { browser } from "#imports"

async function findAppTab(appUrl: string) {
  const appTabs = await browser.tabs.query({ url: `${appUrl}*` })
  return appTabs.find(tab => tab.active) ?? appTabs[0]
}

async function focusAppTab(tab: { id: number, windowId: number }): Promise<void> {
  await browser.tabs.update(tab.id, { active: true })
  await browser.windows.update(tab.windowId, { focused: true })
}

export async function openAppTab(targetUrl?: string): Promise<void> {
  const appUrl = browser.runtime.getURL("/app.html")
  const existing = await findAppTab(appUrl)

  if (existing?.id === undefined) {
    await browser.tabs.create({ url: targetUrl ?? appUrl })
    return
  }

  await browser.tabs.update(existing.id, {
    active: true,
    ...(targetUrl === undefined || existing.url === targetUrl ? {} : { url: targetUrl }),
  })
  await browser.windows.update(existing.windowId, { focused: true })
}

export async function openAppBoard(boardId: string): Promise<void> {
  const appUrl = browser.runtime.getURL("/app.html")
  const existing = await findAppTab(appUrl)

  if (existing?.id === undefined) {
    await browser.tabs.create({
      url: `${appUrl}#/board/${encodeURIComponent(boardId)}`,
    })
    return
  }

  await focusAppTab({ id: existing.id, windowId: existing.windowId })
}
