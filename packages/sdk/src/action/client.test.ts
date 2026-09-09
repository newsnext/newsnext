import type { AllActionContract } from "./index.js"
import { describe, expect, it, vi } from "vitest"
import { createActionsClient } from "./client.js"

describe("actions Client", () => {
  it("maps nested domain methods to canonical Action names", async () => {
    const execute = vi.fn(async () => ({ boardId: "reading" }))
    const actions = createActionsClient<readonly AllActionContract[]>(execute)

    await actions.board.create({ name: "Reading" })
    await actions.source.list()

    expect(execute).toHaveBeenNthCalledWith(1, "board.create", { name: "Reading" }, undefined)
    expect(execute).toHaveBeenNthCalledWith(2, "source.list", {}, undefined)
  })
})
