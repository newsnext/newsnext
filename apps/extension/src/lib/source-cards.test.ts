import type { SourceDescriptor } from "@/typings/source"
import { describe, expect, it } from "vitest"
import { buildBoardSources } from "./source-cards"

const testSources: SourceDescriptor[] = [
  {
    id: "test:feed",
    providerTitle: "Test",
    color: "blue",
    category: "tech",
    home: "https://example.com",
  },
]

describe("buildBoardSources", () => {
  it("marks local-only base and forked sources", () => {
    const boardSources = buildBoardSources({
      sources: testSources,
      boardId: "forks",
      starredSourceInstanceIds: [],
      sourceInstances: [
        {
          instanceId: "test:feed::fork",
          sourceId: "test:feed",
          params: {},
          isFork: true,
          createdAt: 1,
        },
      ],
      isLocalOnly: true,
    })

    expect(boardSources.map["test:feed::fork"]).toMatchObject({
      isFork: true,
      isLocalOnly: true,
      sourceId: "test:feed",
    })
  })
})
