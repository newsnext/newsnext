import type { ChatController } from "@/hooks/use-pi-chat"
import type { ChatProviderSettings } from "@/lib/settings"
import { useAtomValue } from "jotai"
import { browser } from "#imports"
import { usePiChat } from "@/hooks/use-pi-chat"
import { requestSettingsOpen } from "@/lib/settings"
import { chatProviderSettingsAtom } from "@/store/settings"
import { AssistantProviderRequired, AssistantThread } from "./thread"

export function ChatPanel(): React.JSX.Element {
  const provider = useAtomValue(chatProviderSettingsAtom)
  const sessionKey = `${provider.name}\0${provider.baseUrl}\0${provider.model}\0${provider.apiKey}`

  // Provider changes intentionally create a fresh agent and conversation.
  return <ChatPanelSession key={sessionKey} provider={provider} />
}

interface ChatPanelSessionProps {
  provider: ChatProviderSettings
}

function ChatPanelSession({ provider }: ChatPanelSessionProps): React.JSX.Element {
  const chat = usePiChat(provider)
  const configured = Boolean(provider.apiKey && provider.baseUrl && provider.model)

  return (
    <ChatPanelView
      chat={chat}
      configured={configured}
      onOpenProviderSettings={openProviderSettings}
      providerLabel={configured ? `${provider.name} · ${provider.model}` : "Provider not configured"}
    />
  )
}

interface ChatPanelViewProps {
  chat: ChatController
  configured: boolean
  onOpenProviderSettings: () => void | Promise<void>
  providerLabel: string
}

export function ChatPanelView({
  chat,
  configured,
  onOpenProviderSettings,
  providerLabel,
}: ChatPanelViewProps): React.JSX.Element {
  return (
    <main
      className="relative flex size-full min-h-0 flex-col overflow-hidden"
      style={{ backgroundColor: "color-mix(in oklab, var(--background), var(--color-theme-400) 55%)" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-background/70 zenith-theme-400" />
      {configured
        ? (
            <AssistantThread
              chat={chat}
              onOpenProviderSettings={onOpenProviderSettings}
              providerLabel={providerLabel}
            />
          )
        : (
            <AssistantProviderRequired
              onOpenProviderSettings={onOpenProviderSettings}
              providerLabel={providerLabel}
            />
          )}
    </main>
  )
}

async function openProviderSettings(): Promise<void> {
  requestSettingsOpen("provider")
  await browser.runtime.openOptionsPage().catch(() => undefined)
}
