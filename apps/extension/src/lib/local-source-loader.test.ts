import { afterEach, describe, expect, it } from "vitest"
import { loadLocalSource } from "./local-source-loader"

interface RuntimeGlobal {
  chrome?: unknown
}

describe("loadLocalSource", () => {
  afterEach(() => {
    delete (globalThis as RuntimeGlobal).chrome
  })

  it("loads source data through the extension background when available", async () => {
    const sentMessages: unknown[] = []

    ;(globalThis as RuntimeGlobal).chrome = {
      runtime: {
        sendMessage(message: unknown, callback: (response: unknown) => void) {
          sentMessages.push(message)
          callback({
            ok: true,
            items: [{ title: "Loaded in background", url: "https://example.com" }],
            key: "github:default:test",
            updated: 123,
          })
        },
      },
    }

    const result = await loadLocalSource("github:default", { dateRange: "weekly" })

    expect(sentMessages).toEqual([
      {
        type: "load-source",
        sourceId: "github:default",
        params: { dateRange: "weekly" },
      },
    ])
    expect(result).toMatchObject({
      key: "github:default:test",
      updated: 123,
      items: [{ title: "Loaded in background", url: "https://example.com" }],
    })
  })

  it("sends JSON params to the background before local normalization", async () => {
    const sentMessages: unknown[] = []

    ;(globalThis as RuntimeGlobal).chrome = {
      runtime: {
        sendMessage(message: unknown, callback: (response: unknown) => void) {
          sentMessages.push(message)
          callback({
            ok: true,
            items: [{ title: "V2EX", url: "https://www.v2ex.com/t/1" }],
            updated: 123,
          })
        },
      },
    }

    await loadLocalSource("json:default", {
      url: "https://www.v2ex.com/feed/ideas.json",
      headers: "{}",
    })

    expect(sentMessages).toEqual([
      {
        type: "load-source",
        sourceId: "json:default",
        params: {
          url: "https://www.v2ex.com/feed/ideas.json",
          headers: "{}",
        },
      },
    ])
  })
})
