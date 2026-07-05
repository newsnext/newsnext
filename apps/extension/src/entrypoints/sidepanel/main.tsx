import { QueryClient } from "@tanstack/react-query"
import { AppProvider } from "@/components/app-provider"
import { RadarSidePanel } from "@/components/sidepanel/radar-side-panel"
import { renderPersistentReactRoot } from "@/lib/react-root"
import "./style.css"

const queryClient = new QueryClient()

function App() {
  return (
    <AppProvider queryClient={queryClient}>
      <RadarSidePanel />
    </AppProvider>
  )
}

const rootElement = document.getElementById("root")!
renderPersistentReactRoot(rootElement, <App />)
