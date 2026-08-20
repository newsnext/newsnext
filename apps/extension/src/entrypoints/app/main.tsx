import { QueryClient } from "@tanstack/react-query"
import { createHashHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { AppProvider } from "@/components/app-provider"
import { BgIllustrationLayer } from "@/components/bg-illustration-layer"
import { getBoardLayerFromState } from "@/lib/board"
import { renderPersistentReactRoot } from "@/lib/react-root"
import {
  NEXT_LAYER_SCROLL_RESTORATION_SELECTOR,
  ROOT_SCROLL_RESTORATION_SELECTOR,
} from "@/lib/scroll-restoration"
import { syncThemeFavicon, THEME_COLOR_KEY } from "@/lib/utils/swith-theme"
import { routeTree } from "./routeTree"
import "@/styles/index.css"

syncThemeFavicon(localStorage.getItem(THEME_COLOR_KEY) ?? "red")

const queryClient = new QueryClient()
const hashHistory = createHashHistory()
const router = createRouter({
  routeTree,
  history: hashHistory,
  scrollRestoration: true,
  scrollRestorationBehavior: "instant",
  getScrollRestorationKey: location => `${location.href}:${getBoardLayerFromState(location.state) ?? "now"}`,
  scrollToTopSelectors: [
    ROOT_SCROLL_RESTORATION_SELECTOR,
    NEXT_LAYER_SCROLL_RESTORATION_SELECTOR,
  ],
  context: {
    queryClient,
  },
})

function App() {
  return (
    <AppProvider queryClient={queryClient}>
      <BgIllustrationLayer />
      <RouterProvider router={router} />
    </AppProvider>
  )
}

async function renderApp(): Promise<void> {
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
