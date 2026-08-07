import { describe, expect, it } from "vitest"
import {
  buildSourceHistoryDatasetKey,
  buildSourceHistoryItemIdentity,
  buildSourceHistorySnapshotIdentity,
} from "./values"

describe("source history values", () => {
  it("builds stable dataset keys and isolates item identity by provider", () => {
    expect(buildSourceHistoryDatasetKey("test:feed", { page: 1, query: "news" }))
      .toBe(buildSourceHistoryDatasetKey("test:feed", { query: "news", page: 1 }))
    expect(
      buildSourceHistoryItemIdentity("alpha", "https://example.com/item"),
    ).not.toEqual(buildSourceHistoryItemIdentity("beta", "https://example.com/item"))
  })

  it("uses item revisions and order when comparing snapshots", () => {
    expect(buildSourceHistorySnapshotIdentity("ranking", [1, 2]))
      .toBe(buildSourceHistorySnapshotIdentity("ranking", [1, 2]))
    expect(
      buildSourceHistorySnapshotIdentity("ranking", [1, 2]),
    ).not.toBe(buildSourceHistorySnapshotIdentity("ranking", [2, 1]))
  })
})
