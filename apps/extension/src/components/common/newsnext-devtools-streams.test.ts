import type { StreamStatus as NativeStreamStatus } from "@/lib/native-protocol/StreamStatus"
import { describe, expect, it } from "vitest"
import { collectionExplanation, needsStreamAttention, sortStreams, summarizeStreams } from "./newsnext-devtools-streams"

function stream(id: string, overrides: Partial<NativeStreamStatus> = {}): NativeStreamStatus {
  return {
    streamId: id,
    sourceId: "test:feed",
    workerId: "worker",
    instanceIds: ["a", "b"],
    resolved: true,
    observationCount: 10,
    activity: "scheduled",
    policy: {
      intervalMs: 60_000,
      nextRunAt: 120_000,
      lastFetchedAt: 60_000,
      lastAttemptAt: 60_000,
      lastChangedAt: null,
      lastError: null,
      lastOutcome: "fresh",
      phase: "adaptive",
      sampleCount: 10,
      estimatedChangesPerHour: 0.1,
      added: 0,
      removed: 0,
      edited: 0,
      moved: 0,
    },
    ...overrides,
  }
}

describe("stream diagnostic priorities", () => {
  it("counts retained data per shared stream and preserves unknown counts", () => {
    expect(summarizeStreams([
      stream("shared"),
      stream("empty", { observationCount: 0 }),
      stream("unresolved", { resolved: false, observationCount: null }),
      stream("unknown", { observationCount: undefined }),
    ])).toEqual({ observations: 10, unknownCounts: 2, attention: 0, waitingForData: 2 })
    expect(summarizeStreams([])).toEqual({ observations: 0, unknownCounts: 0, attention: 0, waitingForData: 0 })
  })

  it("puts blocked streams first without mutating the input or flagging quiet streams", () => {
    const quiet = stream("quiet")
    const offline = stream("offline", { activity: "offline" })
    const retry = stream("retry", { activity: "backoff" })
    const due = stream("due", { activity: "due" })
    const input = [quiet, retry, due, offline]
    expect(sortStreams(input, true).map(value => value.streamId)).toEqual(["offline", "retry", "due", "quiet"])
    expect(input[0]).toBe(quiet)
    expect(needsStreamAttention(quiet)).toBe(false)
    expect(needsStreamAttention(due)).toBe(false)
    expect(summarizeStreams(input).attention).toBe(2)
  })

  it("keeps default order stable across collection updates and shuffled snapshots", () => {
    const a = stream("a")
    const b = stream("b")
    const source = stream("first", { sourceId: "another:feed" })
    expect(sortStreams([b, a, source]).map(value => value.streamId)).toEqual(["first", "a", "b"])
    b.activity = "backoff"
    b.observationCount = 100
    b.policy.lastOutcome = "error"
    b.policy.lastFetchedAt = 900_000
    expect(sortStreams([source, b, a]).map(value => value.streamId)).toEqual(["first", "a", "b"])
    expect(sortStreams([source, b, a], true).map(value => value.streamId)).toEqual(["b", "first", "a"])
  })

  it("explains current execution before stale outcomes or learning phases", () => {
    const failed = stream("failed")
    failed.policy.lastOutcome = "error"
    expect(needsStreamAttention(failed)).toBe(true)
    expect(collectionExplanation(failed)).toContain("waiting to retry")
    expect(collectionExplanation({ ...failed, activity: "loading" })).toContain("Collecting now")
    expect(collectionExplanation({ ...failed, activity: "offline" })).toContain("reconnects")
    const cached = stream("cached")
    cached.policy.lastOutcome = "cached"
    cached.policy.phase = "burst"
    expect(collectionExplanation(cached)).toContain("adds no observation")
  })
})
