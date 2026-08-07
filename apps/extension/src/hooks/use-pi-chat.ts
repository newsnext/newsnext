import type { Agent } from "@earendil-works/pi-agent-core"
import type { ChatMessage } from "@/lib/chat-messages"
import type { ChatProviderSettings } from "@/lib/settings"
import { useCallback, useEffect, useState } from "react"
import { createChatMessages } from "@/lib/chat-messages"
import { createPiChatAgent } from "@/lib/pi-chat-adapter"

export type { ChatMessage, ChatToolStep } from "@/lib/chat-messages"

export interface ChatController {
  isRunning: boolean
  messages: ChatMessage[]
  sendMessage: (text: string) => Promise<void>
  stop: () => void
}

interface AgentSnapshot {
  isRunning: boolean
  messages: ChatMessage[]
}

export function usePiChat(settings: ChatProviderSettings): ChatController {
  const [agent] = useState(() => createPiChatAgent(settings))
  const [snapshot, setSnapshot] = useState(() => createAgentSnapshot(agent))

  useEffect(() => {
    const unsubscribe = agent.subscribe(() => {
      setSnapshot(createAgentSnapshot(agent))
    })

    return () => {
      unsubscribe()
      agent.abort()
    }
  }, [agent])

  const sendMessage = useCallback(async (text: string): Promise<void> => {
    const prompt = text.trim()
    if (!prompt || agent.state.isStreaming) return

    await agent.prompt(prompt)
    setSnapshot(createAgentSnapshot(agent))
  }, [agent])

  const stop = useCallback(() => agent.abort(), [agent])

  return {
    isRunning: snapshot.isRunning,
    messages: snapshot.messages,
    sendMessage,
    stop,
  }
}

function createAgentSnapshot(agent: Agent): AgentSnapshot {
  return {
    isRunning: agent.state.isStreaming,
    messages: createChatMessages(
      agent.state.messages,
      agent.state.streamingMessage,
      agent.state.isStreaming,
    ),
  }
}
