import type { AgentMessage } from "@earendil-works/pi-agent-core"
import { describe, expect, it } from "vitest"
import { createChatMessages } from "@/lib/chat-messages"

const usage = {
  cacheRead: 0,
  cacheWrite: 0,
  cost: { cacheRead: 0, cacheWrite: 0, input: 0, output: 0, total: 0 },
  input: 0,
  output: 0,
  totalTokens: 0,
}

describe("createChatMessages", () => {
  it("groups tool calls, results, and final text into one assistant turn", () => {
    const messages: AgentMessage[] = [
      { role: "user", content: "What changed?", timestamp: 1 },
      {
        api: "openai-completions",
        content: [{
          type: "toolCall",
          id: "tool-1",
          name: "compare_source_history_observations",
          arguments: { sourceId: "hn/frontpage" },
        }],
        model: "test",
        provider: "test",
        role: "assistant",
        stopReason: "toolUse",
        timestamp: 2,
        usage,
      },
      {
        content: [{ type: "text", text: "result" }],
        details: {
          diff: { added: [{}], missing: [], moved: [{}, {}], updated: [] },
        },
        isError: false,
        role: "toolResult",
        timestamp: 3,
        toolCallId: "tool-1",
        toolName: "compare_source_history_observations",
      },
      {
        api: "openai-completions",
        content: [{ type: "text", text: "Three changes." }],
        model: "test",
        provider: "test",
        role: "assistant",
        stopReason: "stop",
        timestamp: 4,
        usage,
      },
    ]

    expect(createChatMessages(messages)).toEqual([
      { id: "user-1-0", role: "user", text: "What changed?" },
      {
        id: "assistant-2-1",
        role: "assistant",
        text: "Three changes.",
        tools: [{
          id: "tool-1",
          label: "Compare source observations",
          status: "complete",
          summary: "3 changes",
          target: "hn/frontpage",
        }],
      },
    ])
  })

  it("keeps an unresolved streaming tool active and marks it stopped after the run", () => {
    const toolMessage: AgentMessage = {
      api: "openai-completions",
      content: [{
        type: "toolCall",
        id: "tool-2",
        name: "list_source_history_datasets",
        arguments: {},
      }],
      model: "test",
      provider: "test",
      role: "assistant",
      stopReason: "toolUse",
      timestamp: 5,
      usage,
    }

    expect(createChatMessages([toolMessage], undefined, true)[0]?.tools?.[0]?.status).toBe("running")
    expect(createChatMessages([toolMessage], undefined, false)[0]?.tools?.[0]?.status).toBe("stopped")
  })
})
