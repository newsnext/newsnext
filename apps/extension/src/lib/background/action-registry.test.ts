import type { BackgroundActionContext } from "./background-actions"
import { describe, expect, it, vi } from "vitest"
import {
  actionRegistry,
  executeRegisteredAction,
} from "./action-registry"

function createContext(): BackgroundActionContext {
  return {
    currentBoardId: vi.fn(async () => "reading"),
    data: vi.fn(async () => ({ boards: [], instances: [], version: 4 as const })),
    mutate: vi.fn(async () => ({ instanceId: "new" })),
    replace: vi.fn(async data => data),
    requireSources: vi.fn(async () => undefined),
    sources: vi.fn(async () => []),
    app: { open: vi.fn(async () => ({})) },
    developer: {
      fetch: vi.fn(async input => ({
        body: "ok",
        headers: [],
        status: 200,
        statusText: input.method,
      })),
      runSource: vi.fn(async () => ({}) as never),
    },
    radar: { resolveSuggestions: vi.fn(async () => []) },
    job: { executeInstance: vi.fn(async () => ({}) as never) },
    node: {
      loadInstance: vi.fn(async () => ({}) as never),
      readInstanceCache: vi.fn(async () => null),
    },
    source: {
      cancel: vi.fn(async () => undefined),
      load: vi.fn(async () => ({}) as never),
    },
    sourceConnection: {
      getStatus: vi.fn(async () => ({ state: "disabled" as const })),
      getWidgetSnapshot: vi.fn(async () => ({})),
      loadInstance: vi.fn(async () => ({}) as never),
      readInstanceCache: vi.fn(async () => null),
      setEnabled: vi.fn(async () => ({ state: "disabled" as const })),
    },
  }
}

describe("action Registry", () => {
  it("publishes the connected Action contract directly from definitions", () => {
    const actions = actionRegistry.list("connected")

    expect(actions).toHaveLength(31)
    expect(actions.filter(action => action.kind === "mutation")).toHaveLength(14)
    expect(actions.filter(action => action.kind === "query")).toHaveLength(12)
    expect(actions.filter(action => action.kind === "command")).toHaveLength(5)
    expect(actions.find(action => action.name === "instance.create")).toMatchObject({
      inputSchema: { type: "object", additionalProperties: false },
      outputSchema: { type: "object" },
    })
    expect(actions[0]).not.toHaveProperty("execute")
  })

  it("validates parameters before invoking an Action handler", async () => {
    const ActionContext = createContext()

    await expect(executeRegisteredAction("instance.create", {
      boardIds: ["reading"],
      patch: {},
      sourceId: "github:trending",
    }, "ui", ActionContext)).resolves.toEqual({ instanceId: "new" })
    expect(ActionContext.requireSources).toHaveBeenCalledWith(["github:trending"])
    expect(ActionContext.mutate).toHaveBeenCalledOnce()

    await expect(executeRegisteredAction("instance.create", {
      boardId: "reading",
      patch: {},
      sourceId: "github:trending",
    }, "ui", ActionContext)).rejects.toThrow("Invalid Action parameters")
    await expect(executeRegisteredAction("board.update", {
      boardId: "reading",
    }, "ui", ActionContext)).rejects.toThrow("requires at least one change")
  })

  it("enforces audiences and command-specific validation", async () => {
    const ActionContext = createContext()

    await expect(executeRegisteredAction("developer.fetch", {
      headers: [],
      method: "get",
      timeoutMs: 10_000,
      url: "https://example.com/api",
    }, "connected", ActionContext)).resolves.toMatchObject({ statusText: "GET" })
    await expect(executeRegisteredAction("developer.fetch", {
      headers: [["Cookie", "secret"]],
      method: "GET",
      timeoutMs: 10_000,
      url: "https://example.com/api",
    }, "connected", ActionContext)).rejects.toThrow("browser-managed")
    await expect(executeRegisteredAction("application.replace", {}, "connected", ActionContext))
      .rejects
      .toThrow("Unknown Action")
    await expect(executeRegisteredAction("ui.dialog.open", {}, "ui", ActionContext))
      .rejects
      .toThrow("Unknown Action")
  })
})
