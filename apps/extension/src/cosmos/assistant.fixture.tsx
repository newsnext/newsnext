/* eslint-disable react-refresh/only-export-components */
import type { ChatController, ChatMessage } from "@/hooks/use-pi-chat"
import { useState } from "react"
import { ChatPanelView } from "@/components/chat/panel"

const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: "fixture-user-message",
    role: "user",
    text: "Summarize the latest articles in my design board.",
  },
  {
    id: "fixture-assistant-message",
    role: "assistant",
    text: "Your design board has three new articles. The main themes are accessible color systems, variable fonts, and motion that respects reduced-motion preferences.",
  },
]

interface AssistantFixtureProps {
  configured?: boolean
  initialMessages?: ChatMessage[]
}

function AssistantFixture({ configured = true, initialMessages = [] }: AssistantFixtureProps): React.JSX.Element {
  const [messages, setMessages] = useState(initialMessages)
  const [isRunning, setIsRunning] = useState(false)
  const [settingsOpened, setSettingsOpened] = useState(false)
  const chat: ChatController = {
    isRunning,
    messages,
    async sendMessage(text) {
      const timestamp = Date.now()
      setIsRunning(true)
      setMessages(current => [...current, {
        id: `fixture-user-${timestamp}`,
        role: "user",
        text,
      }])
      await Promise.resolve()
      setMessages(current => [...current, {
        id: `fixture-assistant-${timestamp}`,
        role: "assistant",
        text: "This is a local Cosmos response. The lightweight Pi chat controller is working without contacting a provider.",
      }])
      setIsRunning(false)
    },
    stop: () => setIsRunning(false),
  }

  return (
    <main className="mx-auto h-[720px] w-full max-w-[400px] overflow-hidden shadow-2xl">
      <ChatPanelView
        chat={chat}
        configured={configured}
        onOpenProviderSettings={() => setSettingsOpened(true)}
        providerLabel={configured ? "OpenAI-compatible · gpt-5-mini" : "Provider not configured"}
      />
      <p role="status" className="sr-only">
        {settingsOpened ? "Provider settings requested" : "Provider settings not requested"}
      </p>
    </main>
  )
}

function ProviderRequiredFixture(): React.JSX.Element {
  return <AssistantFixture key="provider-required" configured={false} />
}

function EmptyConversationFixture(): React.JSX.Element {
  return <AssistantFixture key="empty-conversation" />
}

function ConversationFixture(): React.JSX.Element {
  return <AssistantFixture key="conversation" initialMessages={SAMPLE_MESSAGES} />
}

export default {
  "Provider required": ProviderRequiredFixture,
  "Empty conversation": EmptyConversationFixture,
  "Conversation": ConversationFixture,
}
