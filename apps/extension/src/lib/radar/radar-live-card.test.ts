import type { ResolvedRadarSuggestion } from "./matcher"
import { describe, expect, it } from "vitest"
import { applySourceSnapshot } from "@/lib/source/live-cards"
import { createRadarLiveCard } from "./radar-live-card"

describe("createRadarLiveCard", () => {
  it("preserves Radar metadata when a Source snapshot arrives", () => {
    const suggestion: ResolvedRadarSuggestion = {
      id: "test-radar:test:feed:{metadata:{title:Radar title}}",
      ruleId: "test-radar",
      sourceId: "test:feed",
      patch: {
        metadata: { title: "Radar title" },
      },
      source: {
        id: "test:feed",
        version: 1,
        provider: {
          title: "Test",
          color: "blue",
        },
        metadata: {
          title: "Static title",
          home: "https://example.com/",
        },
        capabilities: {
          network: [],
          cookies: [],
        },
      },
    }
    const liveCard = createRadarLiveCard(suggestion)

    expect(applySourceSnapshot(liveCard, suggestion.source)).toMatchObject({
      metadata: { title: "Radar title" },
      metadataValue: { title: "Radar title" },
    })
  })
})
