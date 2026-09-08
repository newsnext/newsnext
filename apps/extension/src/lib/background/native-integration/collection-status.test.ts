import { describe, expect, it } from "vitest"
import { parseCollectionStatus } from "./collection-status"

const snapshot = {
  initialized: true,
  sampledAt: 1000,
  persistenceError: null,
  pendingWrites: 0,
  streams: [{
    streamId: "stream",
    sourceId: "test:feed",
    workerId: "worker",
    instanceIds: ["instance-a", "instance-b"],
    resolved: true,
    observationCount: 123,
    activity: "backoff",
    policy: {
      intervalMs: 60_000,
      nextRunAt: 121_000,
      lastFetchedAt: 100,
      lastAttemptAt: 1000,
      lastChangedAt: null,
      lastError: "Loader failed",
      lastOutcome: "error",
      phase: "learning",
      sampleCount: 2,
      estimatedChangesPerHour: 1.2,
      added: 1,
      removed: 0,
      edited: 2,
      moved: 0,
    },
  }],
}

describe("stream diagnostics parsing", () => {
  it("preserves shared stream identity, nullable timestamps and failure details", () => {
    expect(parseCollectionStatus(snapshot)).toEqual(snapshot)
    expect(parseCollectionStatus(snapshot).streams[0]?.observationCount).toBe(123)
    expect(() => parseCollectionStatus({ ...snapshot, streams: [{ ...snapshot.streams[0], observationCount: -1 }] })).toThrow()
    expect(parseCollectionStatus({ ...snapshot, streams: [{ ...snapshot.streams[0], observationCount: undefined }] }).streams[0]?.observationCount).toBeUndefined()
    expect(parseCollectionStatus({ ...snapshot, initialized: false, streams: [], persistenceError: "Database unavailable" }).persistenceError).toBe("Database unavailable")
  })

  it("rejects invalid activity, interval bounds and malformed learning state", () => {
    for (const policy of [
      { intervalMs: 0 },
      { intervalMs: 3_600_001 },
      { sampleCount: 65 },
      { nextRunAt: -1 },
      { estimatedChangesPerHour: -1 },
      { lastOutcome: "unknown" },
      { lastFetchedAt: "yesterday" },
    ]) {
      expect(() => parseCollectionStatus({
        ...snapshot,
        streams: [{ ...snapshot.streams[0], policy: { ...snapshot.streams[0]!.policy, ...policy } }],
      })).toThrow("invalid stream diagnostics")
    }
    expect(() => parseCollectionStatus({ ...snapshot, streams: [{ ...snapshot.streams[0], activity: "unknown" }] })).toThrow()
    expect(() => parseCollectionStatus({ ...snapshot, streams: [null] })).toThrow()
  })
})
