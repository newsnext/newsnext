import type { uiActionDefinitions } from "../background/action-registry"
import { describe, expect, it, vi } from "vitest"
import { createActionsClient } from "./client"

describe("actions Client", () => {
  it("maps nested domain methods to canonical Action names", async () => {
    const execute = vi.fn(async () => ({ boardId: "reading" }))
    const actions = createActionsClient<typeof uiActionDefinitions>(execute)

    await actions.board.create({ name: "Reading" })
    await actions.source.list()

    expect(execute).toHaveBeenNthCalledWith(1, "board.create", { name: "Reading" })
    expect(execute).toHaveBeenNthCalledWith(2, "source.list", {})
  })
})
