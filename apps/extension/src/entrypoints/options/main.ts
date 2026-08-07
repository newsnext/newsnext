import { browser } from "#imports"
import { ensureSettingsOpenRequest } from "@/lib/settings"

ensureSettingsOpenRequest()

window.location.replace(browser.runtime.getURL("/app.html"))
