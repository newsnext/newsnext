import type { ORPCError } from "@orpc/server"
import type { Context } from "./context"
import { createRouterClient } from "@orpc/server"
import { describe, expect, it } from "vitest"
import { appRouter } from "./app-router"

function createTestContext(overrides: Partial<Context> = {}): Context {
  return {
    db: {} as Context["db"],
    session: null,
    instance: {
      listSourceDescriptors: async () => [],
      loadSource: async () => ({
        id: "test",
        key: "test",
        updated: 0,
        status: "success",
        items: [],
      }),
    },
    ...overrides,
  }
}

describe("oRPC app router", () => {
  it("serves public procedures through the oRPC router client", async () => {
    const client = createRouterClient(appRouter, {
      context: createTestContext({
        instance: {
          listSourceDescriptors: async () => [{
            id: "example",
            name: "Example",
            category: "news",
            loader: "json",
            params: {},
          }],
          loadSource: async () => ({
            id: "example",
            key: "example",
            updated: 1,
            status: "success",
            items: [],
          }),
        },
      }),
    })

    await expect(client.getBoard()).resolves.toEqual([{
      id: "example",
      name: "Example",
      category: "news",
      loader: "json",
      params: {},
    }])
  })

  it("rejects protected procedures without a session", async () => {
    const client = createRouterClient(appRouter, {
      context: createTestContext(),
    })

    await expect(client.getSourceState()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    } satisfies Partial<ORPCError<"UNAUTHORIZED", unknown>>)
  })
})
