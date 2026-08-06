import type { ChatModelAdapter, ThreadMessage } from "@assistant-ui/react"
import type { AgentContext, AgentMessage } from "@earendil-works/pi-agent-core"
import type { AssistantMessage, Message, Model, Usage } from "@earendil-works/pi-ai"
import type { ChatProviderSettings } from "./persisted-settings"
import { agentLoop } from "@earendil-works/pi-agent-core"
import { streamSimple } from "@earendil-works/pi-ai/api/openai-completions"

const EMPTY_USAGE: Usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
}

export interface ChatProviderTestResult {
  message: string
  ok: boolean
}

export function createPiChatAdapter(settings: ChatProviderSettings): ChatModelAdapter {
  const model = createModel(settings)

  return {
    async* run({ messages, abortSignal }) {
      const piMessages = messages.slice(0, -1).flatMap(message => toPiMessage(message, model))
      const prompt = messages.at(-1)
      const promptText = prompt ? getMessageText(prompt) : ""
      if (!promptText) {
        throw new Error("Enter a message to start chatting.")
      }

      const context: AgentContext = {
        systemPrompt: "You are the NewsNext assistant. Be helpful, concise, and clear.",
        messages: piMessages,
        tools: [],
      }
      const events = createAgentEventStream(settings, model, context, promptText, abortSignal)

      let responseText = ""
      let errorMessage: string | undefined
      for await (const event of events) {
        if (event.type === "message_update" && event.message.role === "assistant") {
          const nextText = getPiAssistantText(event.message)
          if (nextText !== responseText) {
            responseText = nextText
            yield { content: [{ type: "text", text: responseText }] }
          }
          if (event.assistantMessageEvent.type === "error") {
            errorMessage = event.assistantMessageEvent.error.errorMessage
          }
        }
      }

      if (errorMessage) {
        throw new Error(errorMessage)
      }
    },
  }
}

export async function testPiChatProvider(
  settings: ChatProviderSettings,
  signal?: AbortSignal,
): Promise<ChatProviderTestResult> {
  const model = createModel(settings)
  const context: AgentContext = {
    systemPrompt: "Reply with a short confirmation.",
    messages: [],
    tools: [],
  }
  const events = createAgentEventStream(
    settings,
    model,
    context,
    "Reply with OK.",
    signal,
    16,
    15_000,
  )
  let responseText = ""
  let errorMessage: string | undefined

  for await (const event of events) {
    if (event.type === "message_update" && event.message.role === "assistant") {
      responseText = getPiAssistantText(event.message)
      if (event.assistantMessageEvent.type === "error") {
        errorMessage = event.assistantMessageEvent.error.errorMessage
      }
    }
    if (event.type === "message_end" && event.message.role === "assistant") {
      responseText = getPiAssistantText(event.message)
      if (event.message.stopReason === "error") {
        errorMessage = event.message.errorMessage
      }
    }
  }

  if (errorMessage) {
    return { ok: false, message: errorMessage }
  }
  if (!responseText.trim()) {
    return { ok: false, message: "The provider returned an empty response." }
  }
  return { ok: true, message: "Connection successful. The provider returned a response." }
}

function createAgentEventStream(
  settings: ChatProviderSettings,
  model: Model<"openai-completions">,
  context: AgentContext,
  prompt: string,
  signal?: AbortSignal,
  maxTokens?: number,
  timeoutMs?: number,
) {
  return agentLoop(
    [{ role: "user", content: prompt, timestamp: Date.now() }],
    context,
    {
      model,
      convertToLlm: toLlmMessages,
      getApiKey: () => settings.apiKey,
      maxRetries: 0,
      ...(maxTokens === undefined ? {} : { maxTokens }),
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
    },
    signal,
    (_activeModel, activeContext, options) => streamSimple(model, activeContext, options),
  )
}

function createModel(settings: ChatProviderSettings): Model<"openai-completions"> {
  return {
    id: settings.model,
    name: settings.model,
    api: "openai-completions",
    provider: settings.name,
    baseUrl: settings.baseUrl,
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 16_384,
    compat: {
      supportsDeveloperRole: false,
      supportsReasoningEffort: false,
    },
  }
}

function toPiMessage(message: ThreadMessage, model: Model<"openai-completions">): Message[] {
  const text = getMessageText(message)
  if (!text || message.role === "system") {
    return []
  }
  if (message.role === "user") {
    return [{ role: "user", content: text, timestamp: message.createdAt.getTime() }]
  }

  return [{
    role: "assistant",
    content: [{ type: "text", text }],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: EMPTY_USAGE,
    stopReason: "stop",
    timestamp: message.createdAt.getTime(),
  }]
}

function getMessageText(message: ThreadMessage): string {
  return message.content
    .flatMap(part => part.type === "text" ? [part.text] : [])
    .join("\n")
    .trim()
}

function getPiAssistantText(message: AssistantMessage): string {
  return message.content
    .flatMap(part => part.type === "text" ? [part.text] : [])
    .join("\n")
}

function toLlmMessages(messages: AgentMessage[]): Message[] {
  return messages.flatMap(message => (
    message.role === "user" || message.role === "assistant" || message.role === "toolResult"
      ? [message]
      : []
  ))
}
