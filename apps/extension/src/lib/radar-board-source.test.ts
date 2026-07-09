import { describe, expect, it } from "vitest"
import { mergeRadarDraftPatch } from "./radar-board-source"

describe("mergeRadarDraftPatch", () => {
  it("merges params and metadata patches independently", () => {
    expect(mergeRadarDraftPatch(
      {
        paramsPatch: { username: "newsnext_dev" },
        metaPatch: { title: "NewsNext" },
      },
      {
        paramsPatch: { includeReplies: true },
        metaPatch: { color: "blue" },
      },
    )).toEqual({
      paramsPatch: {
        username: "newsnext_dev",
        includeReplies: true,
      },
      metaPatch: {
        title: "NewsNext",
        color: "blue",
      },
    })
  })
})
