import type { ApplicationData, ApplicationMutationDependencies, ApplicationMutationResult } from "../application"
import type { BackgroundActionContext } from "./background-actions"
import { describe, expect, it, vi } from "vitest"
import {
  actionRegistry,
  executeRegisteredAction,
} from "./action-registry"

const testSource = {
  capabilities: { cookies: [], network: [] },
  id: "github:trending",
  metadata: {},
  provider: { color: "slate" as const, title: "GitHub" },
  version: 1,
}

function createContext(): BackgroundActionContext {
  let storedData: ApplicationData = {
    boardOrder: ["reading"],
    boards: { reading: { color: "blue", name: "Reading", createdAt: 1, layer: "now", nowLayer: { liveCards: [] }, nextLayer: { liveWidgets: [] } } },
    liveCards: {},
    liveWidgets: {},
    version: 12,
  }
  return {
    data: vi.fn(async () => storedData),
    mutate: vi.fn(async (operation: (data: ApplicationData, deps: ApplicationMutationDependencies) => { data: ApplicationData, result?: ApplicationMutationResult }) => {
      const execution = operation(storedData, { createId: () => "new", now: () => 100, workerId: "worker" })
      storedData = execution.data
      return execution.result ?? {}
    }),
    replace: vi.fn(async data => data),
    requireSources: vi.fn(async () => [testSource]),
    sources: vi.fn(async () => [testSource]),
    developer: {
      fetch: vi.fn(async input => ({
        body: "ok",
        headers: [],
        status: 200,
        statusText: input.method,
        url: "https://example.com/api",
      })),
      runSource: vi.fn(async () => ({}) as never),
    },
    radar: { resolveSuggestions: vi.fn(async () => []) },
    loader: {
      loadLiveCard: vi.fn(async () => ({}) as never),
      readLiveCardSnapshot: vi.fn(async () => null),
    },
    source: {
      cancel: vi.fn(async () => undefined),
      load: vi.fn(async () => ({}) as never),
    },
    liveCardRouter: {
      load: vi.fn(async () => ({}) as never),
      readSnapshot: vi.fn(async () => null),
    },
    nativeIntegration: {
      setCollectionSubscribed: vi.fn(),
      getLogs: vi.fn(async () => []),
      setLogLevel: vi.fn(async () => undefined),
      getCollectionStatus: vi.fn(async () => ({ initialized: false, sampledAt: 0, persistenceError: null, pendingWrites: 0, streams: [] })),
      getStatus: vi.fn(async () => ({
        capabilities: [],
        offlineWorkers: [],
        state: "disabled" as const,
        workerId: "worker",
      })),
      getWidgets: vi.fn(async () => []),
      resolveWorkspace: vi.fn(),
      setEnabled: vi.fn(async () => ({
        capabilities: [],
        offlineWorkers: [],
        state: "disabled" as const,
        workerId: "worker",
      })),
      restart: vi.fn(async () => undefined),
    },
    workerManagement: {
      regenerateIdentity: vi.fn(async () => ({
        capabilities: [],
        offlineWorkers: [],
        state: "connecting" as const,
        workerId: "new-worker",
      })),
      takeOver: vi.fn(async () => ({
        capabilities: [],
        offlineWorkers: [],
        state: "disabled" as const,
        workerId: "worker",
      })),
    },
  }
}

describe("action Registry", () => {
  it("publishes the complete Action contract directly from definitions", () => {
    const actions = actionRegistry.list()

    expect(actions).toHaveLength(46)
    expect(actions.filter(action => action.kind === "mutation")).toHaveLength(25)
    expect(actions.filter(action => action.kind === "query")).toHaveLength(17)
    expect(actions.filter(action => action.kind === "command")).toHaveLength(4)
    expect(actions.find(action => action.name === "liveCard.create")).toMatchObject({
      inputSchema: { type: "object", additionalProperties: false },
      outputSchema: { type: "object" },
    })
    expect(actions.some(action => action.name === "liveCard.move")).toBe(true)
    expect(actions[0]).not.toHaveProperty("execute")
  })

  it("validates parameters before invoking an Action handler", async () => {
    const ActionContext = createContext()

    await expect(executeRegisteredAction("liveCard.create", {
      boardId: "reading",
      patch: {},
      sourceId: "github:trending",
    }, "ui", ActionContext)).resolves.toEqual({ cardId: "new", liveCard: expect.objectContaining({ cardId: "new" }) })
    expect(ActionContext.requireSources).toHaveBeenCalledWith(["github:trending"])
    expect(ActionContext.mutate).toHaveBeenCalledOnce()

    await expect(executeRegisteredAction("board.update", {
      boardId: "reading",
    }, "ui", ActionContext)).rejects.toThrow("requires at least one change")
  })

  it("allows CLI access to all Actions and preserves command-specific validation", async () => {
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
    const data = { boardOrder: [], boards: {}, liveCards: {}, liveWidgets: {}, version: 12 as const }
    await expect(executeRegisteredAction("application.replace", data, "connected", ActionContext))
      .resolves
      .toEqual(data)
    expect(ActionContext.replace).toHaveBeenCalledWith(data)
    await expect(executeRegisteredAction("ui.dialog.open", {}, "ui", ActionContext))
      .rejects
      .toThrow("Unknown Action")
  })
})
