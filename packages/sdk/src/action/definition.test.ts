import Type from "typebox"
import { describe, expect, it } from "vitest"
import { createActionCatalog, defineActionContract } from "./definition.js"

describe("action catalog", () => {
  const getLogs = defineActionContract({
    name: "nativeIntegration.getLogs",
    kind: "query",
    description: "Read logs",
    params: Type.Object({}),
    result: Type.Array(Type.String()),
  })
  const createBoard = defineActionContract({
    name: "board.create",
    kind: "mutation",
    description: "Create a Board",
    params: Type.Object({ name: Type.String() }),
    result: Type.Object({ boardId: Type.String() }),
  })

  it("indexes combined contract lists by their declared names", () => {
    const catalog = createActionCatalog([createBoard, getLogs])

    expect(Object.keys(catalog)).toEqual(["board.create", "nativeIntegration.getLogs"])
    expect(catalog["board.create"]).toBe(createBoard)
    expect(catalog["nativeIntegration.getLogs"]).toBe(getLogs)
  })

  it("rejects duplicate names instead of replacing a contract", () => {
    expect(() => createActionCatalog([getLogs, { ...createBoard, name: getLogs.name }]))
      .toThrow("Duplicate Action name 'nativeIntegration.getLogs'")
  })
})
