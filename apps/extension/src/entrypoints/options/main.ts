import { browser } from "#imports"
import { requestSettingsOpen } from "@/lib/settings-navigation"

requestSettingsOpen()

window.location.replace(browser.runtime.getURL("/app.html"))
