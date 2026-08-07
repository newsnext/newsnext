import type { Agent, AgentMessage } from "@earendil-works/pi-agent-core"
import type { ChatProviderSettings } from "@/lib/settings"
import { useCallback, useEffect, useState } from "react"
import { createPiChatAgent } from "@/lib/pi-chat-adapter"

export interface ChatMessage {
  failed?: boolean
  id: string
  role: "assistant" | "user"
  text: string
}

export interface ChatController {
  isRunning: boolean
  messages: ChatMessage[]
  sendMessage: (text: string) => Promise<void>
  stop: () => void
  streamingMessage?: ChatMessage
}

interface AgentSnapshot {
  isRunning: boolean
  messageCount: number
  messages: ChatMessage[]
  streamingMessage?: ChatMessage
}

export function usePiChat(settings: ChatProviderSettings): ChatController {
  const [agent] = useState(() => createPiChatAgent(settings))
  const [snapshot, setSnapshot] = useState(() => createAgentSnapshot(agent))

  useEffect(() => {
    const unsubscribe = agent.subscribe(() => {
      setSnapshot(current => createAgentSnapshot(agent, current))
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
    setSnapshot(current => createAgentSnapshot(agent, current))
  }, [agent])

  const stop = useCallback(() => agent.abort(), [agent])

  return {
    isRunning: snapshot.isRunning,
    messages: snapshot.messages,
    sendMessage,
    stop,
    ...(snapshot.streamingMessage ? { streamingMessage: snapshot.streamingMessage } : {}),
  }
}

function createAgentSnapshot(agent: Agent, current?: AgentSnapshot): AgentSnapshot {
  const messageCount = agent.state.messages.length
  const messages = current?.messageCount === messageCount
    ? current.messages
    : agent.state.messages.flatMap((message, index) => {
        const chatMessage = toChatMessage(message, index)
        return chatMessage ? [chatMessage] : []
      })
  const streamingMessage = agent.state.streamingMessage
    ? toChatMessage(agent.state.streamingMessage, messages.length)
    : undefined

  return {
    isRunning: agent.state.isStreaming,
    messageCount,
    messages,
    ...(streamingMessage ? { streamingMessage } : {}),
  }
}

function toChatMessage(message: AgentMessage, index: number): ChatMessage | undefined {
  if (message.role !== "assistant" && message.role !== "user") return undefined

  const text = getMessageText(message)
  const failed = message.role === "assistant" && message.stopReason === "error"

  if (!text && !failed) return undefined

  return {
    id: `${message.role}-${message.timestamp}-${index}`,
    role: message.role,
    text,
    ...(failed ? { failed } : {}),
  }
}

function getMessageText(message: Extract<AgentMessage, { role: "assistant" | "user" }>): string {
  if (typeof message.content === "string") return message.content

  return message.content
    .flatMap(part => part.type === "text" ? [part.text] : [])
    .join("\n")
}
