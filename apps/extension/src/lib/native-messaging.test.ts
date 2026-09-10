import { describe, expect, it } from "vitest"
import { parseExtensionCommand } from "./native-messaging.js"

describe("native messaging protocol", () => {
  it("parses Action discovery and execution requests", () => {
    expect(parseExtensionCommand({
      id: "list-id",
      type: "action.list",
    })).toEqual({ id: "list-id", type: "action.list" })
    expect(parseExtensionCommand({
      id: "action-id",
      type: "action.execute",
      name: "board.delete",
      input: { boardId: "reading", deleteLiveCards: true },
    })).toEqual({
      id: "action-id",
      type: "action.execute",
      name: "board.delete",
      input: { boardId: "reading", deleteLiveCards: true },
    })
  })

  it("rejects malformed Action requests", () => {
    expect(() => parseExtensionCommand({
      id: "action-id",
      type: "action.execute",
      name: "board.delete",
      input: null,
    })).toThrow("Invalid extension command")
    expect(() => parseExtensionCommand({
      id: "action-id",
      type: "action.execute",
      name: "",
      input: {},
    })).toThrow("Invalid extension command")
    expect(() => parseExtensionCommand({
      id: "obsolete-id",
      type: "application.query.list",
    })).toThrow("Invalid extension command")
  })
})
