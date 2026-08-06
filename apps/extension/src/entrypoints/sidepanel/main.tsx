import { ChatPanel } from "@/components/chat/panel"
import { renderPersistentReactRoot } from "@/lib/react-root"
import "@/styles/index.css"

const rootElement = document.getElementById("root")!
renderPersistentReactRoot(rootElement, <ChatPanel />)
