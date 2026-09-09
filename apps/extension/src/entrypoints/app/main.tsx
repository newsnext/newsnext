import { QueryClient } from "@tanstack/react-query"
import { createHashHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { AppProvider } from "@/components/app-provider"
import { stageExternalRssRadarIntent } from "@/lib/radar"
import { renderPersistentReactRoot } from "@/lib/react-root"
import { syncThemeFavicon, THEME_COLOR_KEY } from "@/lib/utils/swith-theme"
import { initializeApplicationDataStorage } from "@/store/board"
import { initializeSettingsStorage } from "@/store/settings"
import { routeTree } from "./routeTree"
import "@/styles/index.css"

void syncThemeFavicon(localStorage.getItem(THEME_COLOR_KEY) ?? "red")

const externalRssLocation = stageExternalRssRadarIntent(
  window.location.pathname,
  window.location.search,
  window.location.hash,
)
if (externalRssLocation) {
  window.history.replaceState(window.history.state, "", externalRssLocation)
}

const queryClient = new QueryClient()
const hashHistory = createHashHistory()
// Board views restore scroll after their content mounts, including Layer-only changes.
window.history.scrollRestoration = "manual"
const router = createRouter({
  routeTree,
  history: hashHistory,
  context: {
    queryClient,
  },
})

function App() {
  return (
    <AppProvider queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProvider>
  )
}

async function renderApp(): Promise<void> {
  await Promise.all([
    initializeApplicationDataStorage(),
    initializeSettingsStorage(),
  ])

  if (
    import.meta.env.DEV
      && import.meta.env.WXT_ENABLE_REACT_SCAN === "true"
  ) {
    const { scan } = await import("react-scan")
    scan({
      showToolbar: true,
      trackUnnecessaryRenders: true,
    })
  }

  const rootElement = document.getElementById("root")!
  renderPersistentReactRoot(rootElement, <App />)
}

void renderApp()
