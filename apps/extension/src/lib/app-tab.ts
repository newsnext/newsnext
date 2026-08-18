import { browser } from "#imports"

export async function openAppTab(targetUrl?: string): Promise<void> {
  const appUrl = browser.runtime.getURL("/app.html")
  const appTabs = await browser.tabs.query({ url: `${appUrl}*` })
  const existing = appTabs.find(tab => tab.active) ?? appTabs[0]

  if (existing?.id === undefined) {
    await browser.tabs.create({ url: targetUrl ?? appUrl })
    return
  }

  await Promise.all([
    browser.tabs.update(existing.id, {
      active: true,
      ...(targetUrl === undefined || existing.url === targetUrl ? {} : { url: targetUrl }),
    }),
    browser.windows.update(existing.windowId, { focused: true }),
  ])
}
