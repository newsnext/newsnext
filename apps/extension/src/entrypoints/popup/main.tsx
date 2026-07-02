import { QueryClient } from "@tanstack/react-query"
import { AppProvider } from "@/components/app-provider"
import { StarredSidePanel } from "@/components/sidepanel/starred-side-panel"
import { renderPersistentReactRoot } from "@/lib/react-root"
import "./style.css"

const queryClient = new QueryClient()

function App() {
  return (
    <AppProvider queryClient={queryClient}>
      <StarredSidePanel />
    </AppProvider>
  )
}

const rootElement = document.getElementById("root")!
renderPersistentReactRoot(rootElement, <App />)
