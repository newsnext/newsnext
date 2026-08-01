import { browser } from "#imports"

const settingsUrl = browser.runtime.getURL("/app.html?settings")

window.location.replace(settingsUrl)
