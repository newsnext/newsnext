import { describe, expect, it, vi } from "vitest"
import { parseNativeNotification } from "./protocol"

vi.mock("#imports", () => ({ browser: {} }))

const entry = {
  id: 1,
  timestamp: "2026-09-18T11:17:24.000Z",
  level: "info",
  target: "rpc",
  message: "RPC request completed",
}

describe("parseNativeNotification logsChanged", () => {
  it("accepts log batches and preserves entries", () => {
    expect(parseNativeNotification("logsChanged", { entries: [entry] })).toEqual({
      method: "logsChanged",
      params: { entries: [entry] },
    })
    expect(parseNativeNotification("logsChanged", { entries: [] })).toEqual({
      method: "logsChanged",
      params: { entries: [] },
    })
  })

  it("rejects malformed log batches", () => {
    for (const params of [
      { entries: [{ ...entry, id: 1.5 }] },
      { entries: [{ ...entry, level: "debug" }] },
      { entries: [{ ...entry, message: 42 }] },
      { entries: "none" },
      {},
    ]) expect(() => parseNativeNotification("logsChanged", params)).toThrow()
  })
})
