import { describe, expect, it, vi } from "vitest"
import { parseNativeHostValue, parseNativeNotification } from "./protocol"

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

describe("parseNativeNotification insightCatalogChanged", () => {
  it("accepts custom entries without view and built-in entries with preset", () => {
    const base = {
      id: "clock",
      title: "Clock",
      color: "slate",
      width: 2,
      height: 1,
      minWidth: 2,
      minHeight: 1,
      params: {},
      dataRevision: "data-rev",
      dataFiles: [],
      viewRevision: "view-rev",
      hasData: false,
      refreshIntervalMs: 300_000,
    }
    const insights = [
      { ...base, url: "http://127.0.0.1:43121/insights/clock/index.html" },
      { ...base, id: "cloud", title: "Cloud", view: { preset: "word-cloud", query: "words" } },
    ]
    expect(parseNativeNotification("insightCatalogChanged", { insights })).toEqual({
      method: "insightCatalogChanged",
      params: { insights },
    })
  })
})

describe("startup progress frames", () => {
  const progress = { id: "index", label: "Indexing", stage: "Building titles", completedSteps: 0, totalSteps: 3, startedAt: 1000, elapsedMs: 120000 }
  const frame = { type: "initializing", protocolVersion: 38, daemonVersion: "1.0.0", pid: 42, progress, logs: [entry] }

  it("accepts long-running progress and startup log snapshots", () => {
    expect(parseNativeHostValue(frame)).toEqual(frame)
    expect(parseNativeHostValue({ ...frame, progress: null })).toEqual({ ...frame, progress: null })
  })

  it("rejects impossible progress counts and malformed timestamps", () => {
    for (const changes of [{ completedSteps: 4 }, { totalSteps: 0 }, { elapsedMs: -1 }, { startedAt: 1.5 }, { stage: 42 }]) {
      expect(() => parseNativeHostValue({ ...frame, progress: { ...progress, ...changes } })).toThrow()
    }
  })
})
