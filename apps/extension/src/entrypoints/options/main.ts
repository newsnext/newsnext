import { browser } from "#imports"

const settingsUrl = browser.runtime.getURL("/dashboard.html?settings")

window.location.replace(settingsUrl)
