import { browser } from "#imports"
import { ensureSettingsOpenRequest } from "@/lib/settings-navigation"

ensureSettingsOpenRequest()

window.location.replace(browser.runtime.getURL("/app.html"))
