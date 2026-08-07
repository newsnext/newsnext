import type { AgentMessage } from "@earendil-works/pi-agent-core"
import { getSourceHistoryToolLabel } from "./source/history/tool-metadata"

type ChatToolStatus = "complete" | "error" | "running" | "stopped"

export interface ChatToolStep {
  id: string
  label: string
  status: ChatToolStatus
  summary?: string
  target: string
}

export interface ChatMessage {
  failed?: boolean
  id: string
  role: "assistant" | "user"
  text: string
  tools?: ChatToolStep[]
}

export function createChatMessages(
  messages: AgentMessage[],
  streamingMessage?: AgentMessage,
  isRunning = false,
): ChatMessage[] {
  const result: ChatMessage[] = []
  let assistant: ChatMessage | undefined

  for (const [index, message] of [...messages, ...(streamingMessage ? [streamingMessage] : [])].entries()) {
    if (message.role === "user") {
      const text = getMessageText(message)
      if (!text) continue
      assistant = undefined
      result.push({
        id: `user-${message.timestamp}-${index}`,
        role: "user",
        text,
      })
      continue
    }

    if (message.role === "assistant") {
      const text = getMessageText(message)
      const toolCalls = message.content.filter(part => part.type === "toolCall")
      const failed = message.stopReason === "error"
      if (!text && toolCalls.length === 0 && !failed) continue

      if (!assistant) {
        assistant = {
          id: `assistant-${message.timestamp}-${index}`,
          role: "assistant",
          text: "",
        }
        result.push(assistant)
      }
      if (text) assistant.text = [assistant.text, text].filter(Boolean).join("\n")
      if (failed) assistant.failed = true
      if (toolCalls.length > 0) {
        const currentTools = assistant.tools ?? []
        for (const toolCall of toolCalls) {
          const existing = currentTools.find(tool => tool.id === toolCall.id)
          const step = toChatToolStep(toolCall.id, toolCall.name, toolCall.arguments)
          if (existing) Object.assign(existing, step)
          else currentTools.push(step)
        }
        assistant.tools = currentTools
      }
      continue
    }

    if (message.role === "toolResult" && assistant?.tools) {
      const tool = assistant.tools.find(step => step.id === message.toolCallId)
      if (!tool) continue
      tool.status = message.isError ? "error" : "complete"
      tool.summary = summarizeToolResult(message.toolName, message.details)
    }
  }

  if (!isRunning) {
    for (const message of result) {
      for (const tool of message.tools ?? []) {
        if (tool.status === "running") tool.status = "stopped"
      }
    }
  }

  return result
}

function getMessageText(message: Extract<AgentMessage, { role: "assistant" | "user" }>): string {
  if (typeof message.content === "string") return message.content

  return message.content
    .flatMap(part => part.type === "text" ? [part.text] : [])
    .join("\n")
}

function toChatToolStep(id: string, name: string, args: unknown): ChatToolStep {
  const values = isRecord(args) ? args : {}
  return {
    id,
    label: getSourceHistoryToolLabel(name) ?? name.replaceAll("_", " "),
    status: "running",
    target: getToolTarget(values),
  }
}

function getToolTarget(args: Record<string, unknown>): string {
  if (typeof args.sourceId === "string") return args.sourceId
  if (typeof args.providerId === "string") return args.providerId
  return "local history"
}

function summarizeToolResult(name: string, details: unknown): string | undefined {
  if (!isRecord(details)) return
  if (name === "list_source_history_datasets") {
    return pluralize(getArrayLength(details.datasets), "source")
  }
  if (name === "list_source_history_observations") {
    return pluralize(getArrayLength(details.observations), "observation")
  }
  if (name === "get_source_history_observation") {
    const observation = isRecord(details.observation) ? details.observation : undefined
    return pluralize(observation ? getArrayLength(observation.items) : undefined, "item")
  }
  if (name === "compare_source_history_observations") {
    const diff = isRecord(details.diff) ? details.diff : undefined
    if (!diff) return
    const changes = ["added", "missing", "moved", "updated"]
      .reduce((total, key) => total + (getArrayLength(diff[key]) ?? 0), 0)
    return pluralize(changes, "change")
  }
}

function pluralize(count: number | undefined, noun: string): string | undefined {
  if (count === undefined) return
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}

function getArrayLength(value: unknown): number | undefined {
  return Array.isArray(value) ? value.length : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
