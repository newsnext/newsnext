import type { AgentContext, AgentMessage, StreamFn } from "@earendil-works/pi-agent-core"
import type { Message, Model } from "@earendil-works/pi-ai"
import type { ChatProviderSettings } from "./settings/persisted-settings"
import { Agent, agentLoop } from "@earendil-works/pi-agent-core"
import { streamSimple } from "@earendil-works/pi-ai/api/openai-completions"
import { SOURCE_HISTORY_SKILL } from "./source/history/skill"
import { sourceHistoryTools } from "./source/history/tools"

const NEWSNEXT_SYSTEM_PROMPT = [
  "You are the NewsNext assistant. Be helpful, concise, and clear.",
  SOURCE_HISTORY_SKILL,
].join("\n\n")

export interface ChatProviderTestResult {
  message: string
  ok: boolean
}

export function createPiChatAgent(settings: ChatProviderSettings): Agent {
  const model = createModel(settings)

  return new Agent({
    initialState: {
      systemPrompt: NEWSNEXT_SYSTEM_PROMPT,
      messages: [],
      model,
      thinkingLevel: "off",
      tools: sourceHistoryTools,
    },
    getApiKey: () => settings.apiKey,
    streamFn: createStreamFn(model),
  })
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
  const events = agentLoop(
    [{ role: "user", content: "Reply with OK.", timestamp: Date.now() }],
    context,
    {
      model,
      convertToLlm: toLlmMessages,
      getApiKey: () => settings.apiKey,
      maxRetries: 0,
      maxTokens: 16,
      timeoutMs: 15_000,
    },
    signal,
    createStreamFn(model),
  )
  let responseText = ""
  let errorMessage: string | undefined

  for await (const event of events) {
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

function createStreamFn(model: Model<"openai-completions">): StreamFn {
  return (_activeModel, context, options) => streamSimple(
    model,
    context,
    { ...options, maxRetries: 0 },
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

function getPiAssistantText(message: Extract<Message, { role: "assistant" }>): string {
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
