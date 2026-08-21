import { describe, expect, it } from "vitest"
import { parseExtensionConnectionCommandRequest } from "."

describe("extension connection protocol", () => {
  it("parses Action discovery and execution requests", () => {
    expect(parseExtensionConnectionCommandRequest({
      id: "list-id",
      type: "action.list",
    })).toEqual({ id: "list-id", type: "action.list" })
    expect(parseExtensionConnectionCommandRequest({
      id: "action-id",
      type: "action.execute",
      name: "collection.delete",
      input: { collectionId: "reading", deleteInstances: true },
    })).toEqual({
      id: "action-id",
      type: "action.execute",
      name: "collection.delete",
      input: { collectionId: "reading", deleteInstances: true },
    })
  })

  it("rejects malformed Action requests", () => {
    expect(() => parseExtensionConnectionCommandRequest({
      id: "action-id",
      type: "action.execute",
      name: "collection.delete",
      input: null,
    })).toThrow("Invalid extension command")
    expect(() => parseExtensionConnectionCommandRequest({
      id: "action-id",
      type: "action.execute",
      name: "",
      input: {},
    })).toThrow("Invalid extension command")
    expect(() => parseExtensionConnectionCommandRequest({
      id: "legacy-id",
      type: "application.query.list",
    })).toThrow("Invalid extension command")
  })
})
