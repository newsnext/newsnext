import type { HydratedSourceHistoryObservation } from "./source-history-repository-values"
import { describe, expect, it } from "vitest"
import { compareSourceHistoryObservationValues } from "./source-history-repository-values"

function observation(
  observedAt: number,
  items: Array<{ position: number, title: string, url: string }>,
): HydratedSourceHistoryObservation {
  return {
    items: items.map(item => ({
      identity: { providerId: "example", url: item.url },
      position: item.position,
      value: { title: item.title, url: item.url },
    })),
    kind: "ranking",
    observedAt,
    sourceVersion: 1,
  }
}

describe("source history repository values", () => {
  it("reports neutral additions, missing items, movements, and field updates", () => {
    const before = observation(100, [
      { position: 1, title: "Alpha", url: "https://example.com/alpha" },
      { position: 2, title: "Beta", url: "https://example.com/beta" },
    ])
    const after = observation(200, [
      { position: 1, title: "Beta updated", url: "https://example.com/beta" },
      { position: 2, title: "Gamma", url: "https://example.com/gamma" },
    ])

    expect(compareSourceHistoryObservationValues(before, after)).toMatchObject({
      added: [{ position: 2, value: { title: "Gamma" } }],
      afterObservedAt: 200,
      beforeObservedAt: 100,
      missing: [{ position: 1, value: { title: "Alpha" } }],
      moved: [{ afterPosition: 1, beforePosition: 2 }],
      updated: [{ changedFields: ["title"] }],
    })
  })

  it("keeps identical URLs isolated by provider", () => {
    const before = observation(100, [
      { position: 1, title: "Alpha", url: "https://example.com/shared" },
    ])
    const after = observation(200, [
      { position: 1, title: "Alpha", url: "https://example.com/shared" },
    ])
    after.items[0]!.identity.providerId = "another"

    expect(compareSourceHistoryObservationValues(before, after)).toMatchObject({
      added: [{ identity: { providerId: "another" } }],
      missing: [{ identity: { providerId: "example" } }],
      moved: [],
      updated: [],
    })
  })
})
