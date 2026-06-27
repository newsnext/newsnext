import type { SourceDescriptor } from "@/typings/source"
import { describe, expect, it } from "vitest"
import { buildBoardSources } from "./source-cards"

const testSources: SourceDescriptor[] = [
  {
    id: "test:default",
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
          instanceId: "test:default::fork",
          sourceId: "test:default",
          params: {},
          isFork: true,
          createdAt: 1,
        },
      ],
      isLocalOnly: true,
    })

    expect(boardSources.map["test:default::fork"]).toMatchObject({
      isFork: true,
      isLocalOnly: true,
      sourceId: "test:default",
    })
  })
})
