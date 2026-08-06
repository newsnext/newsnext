/* eslint-disable react-refresh/only-export-components */
import type { ChatModelAdapter, ThreadMessageLike } from "@assistant-ui/react"
import { useLocalRuntime } from "@assistant-ui/react"
import { useState } from "react"
import { ChatPanelView } from "@/components/chat/panel"

const SAMPLE_MESSAGES: ThreadMessageLike[] = [
  {
    id: "fixture-user-message",
    role: "user",
    content: "Summarize the latest articles in my design board.",
  },
  {
    id: "fixture-assistant-message",
    role: "assistant",
    content: "Your design board has three new articles. The main themes are accessible color systems, variable fonts, and motion that respects reduced-motion preferences.",
  },
]

const FIXTURE_ADAPTER: ChatModelAdapter = {
  async* run() {
    yield {
      content: [{
        type: "text",
        text: "This is a local Cosmos response. The composer and assistant-ui runtime are working without contacting a provider.",
      }],
    }
  },
}

interface AssistantFixtureProps {
  configured?: boolean
  initialMessages?: ThreadMessageLike[]
}

function AssistantFixture({ configured = true, initialMessages = [] }: AssistantFixtureProps): React.JSX.Element {
  const runtime = useLocalRuntime(FIXTURE_ADAPTER, { initialMessages })
  const [settingsOpened, setSettingsOpened] = useState(false)

  return (
    <main className="mx-auto h-[720px] w-full max-w-[400px] overflow-hidden shadow-2xl">
      <ChatPanelView
        configured={configured}
        onOpenProviderSettings={() => setSettingsOpened(true)}
        providerLabel={configured ? "OpenAI-compatible · gpt-5-mini" : "Provider not configured"}
        runtime={runtime}
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
