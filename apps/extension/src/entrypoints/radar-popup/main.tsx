import { QueryClient } from "@tanstack/react-query"
import { AppProvider } from "@/components/app-provider"
import { RadarPopup } from "@/components/popup/radar-popup"
import { renderPersistentReactRoot } from "@/lib/react-root"
import { initializeApplicationDataStorage } from "@/store/board"
import { initializeSettingsStorage } from "@/store/settings"
import "@/styles/index.css"
import "./style.css"

const queryClient = new QueryClient()

function App() {
  return (
    <AppProvider queryClient={queryClient}>
      <RadarPopup />
    </AppProvider>
  )
}

async function renderApp(): Promise<void> {
  await Promise.all([
    initializeApplicationDataStorage(),
    initializeSettingsStorage(),
  ])

  const rootElement = document.getElementById("root")!
  renderPersistentReactRoot(rootElement, <App />)
}

void renderApp()
