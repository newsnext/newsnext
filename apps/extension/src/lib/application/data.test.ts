import { describe, expect, it } from "vitest"
import { createEmptyApplicationData, ensureApplicationDataIntegrity } from "./data"

describe("ensureApplicationDataIntegrity", () => {
  it("uses the supplied name when creating the initial Board", () => {
    const data = ensureApplicationDataIntegrity(createEmptyApplicationData(), {
      boardId: "board",
      boardName: "我的看板",
      createdAt: 1,
    })

    expect(data.boards[0]).toMatchObject({
      createdAt: 1,
      id: "board",
      name: "我的看板",
    })
  })
})
