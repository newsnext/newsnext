import { describe, expect, it } from "vitest"
import {
  listApplicationActions,
  listApplicationQueries,
  parseApplicationAction,
  parseApplicationQuery,
} from "./catalog"

describe("application operation catalog", () => {
  it("describes every Action without exposing its implementation", () => {
    const actions = listApplicationActions()

    expect(actions.map(action => action.name)).toContain("collection.addInstance")
    expect(actions.map(action => action.name)).toContain("collection.update")
    expect(actions.map(action => action.name)).toContain("instance.create")
    expect(actions.find(action => action.name === "instance.create"))
      .toMatchObject({
        description: expect.any(String),
        inputSchema: { type: "object" },
        outputSchema: { type: "object" },
      })
    expect(actions[0]).not.toHaveProperty("parseInput")
  })

  it("parses a canonical Action and rejects invalid input", () => {
    expect(parseApplicationAction({
      type: "instance.create",
      input: {
        collectionId: null,
        sourceId: "github:trending",
        patch: { params: { language: "typescript" } },
      },
    })).toEqual({
      type: "instance.create",
      input: {
        collectionId: null,
        sourceId: "github:trending",
        patch: { params: { language: "typescript" } },
      },
    })
    expect(() => parseApplicationAction({
      type: "collection.create",
      input: { name: "AI", color: "invisible" },
    })).toThrow("Unsupported input field")
    expect(parseApplicationAction({
      type: "collection.delete",
      input: { collectionId: "reading", deleteInstances: true },
    })).toEqual({
      type: "collection.delete",
      input: { collectionId: "reading", deleteInstances: true },
    })
    expect(() => parseApplicationAction({
      type: "collection.delete",
      input: { collectionId: "reading", deleteInstances: "yes" },
    })).toThrow("must be a boolean")
    expect(() => parseApplicationAction({
      type: "view.configureCollection",
      input: { collectionId: "reading", color: "invisible" },
    })).toThrow("supported theme color")
    expect(() => parseApplicationAction({ type: "unknown", input: {} }))
      .toThrow("Unknown application Action")
    expect(parseApplicationAction({
      type: "collection.create",
      input: {
        name: "Subscriptions",
        instances: [{
          sourceId: "rss:feed",
          patch: { params: { url: "https://example.com/feed.xml" } },
        }],
      },
    })).toEqual({
      type: "collection.create",
      input: {
        name: "Subscriptions",
        instances: [{
          sourceId: "rss:feed",
          patch: { params: { url: "https://example.com/feed.xml" } },
        }],
      },
    })
    expect(parseApplicationAction({
      type: "collection.update",
      input: {
        collectionId: "reading",
        name: "Research",
        view: { color: "purple", defaultView: "next" },
      },
    })).toEqual({
      type: "collection.update",
      input: {
        collectionId: "reading",
        name: "Research",
        view: { color: "purple", defaultView: "next" },
      },
    })
    expect(() => parseApplicationAction({
      type: "view.configureCollection",
      input: { collectionId: "reading", defaultView: "future" },
    })).toThrow("must be now or next")
    expect(() => parseApplicationAction({
      type: "view.configureCollection",
      input: { collectionId: "reading", filter: null },
    })).toThrow("Unsupported input field")
  })

  it("describes and parses canonical Queries", () => {
    expect(listApplicationQueries().map(query => query.name)).toEqual([
      "source.list",
      "source.get",
      "collection.list",
      "collection.get",
      "collection.listInstances",
      "instance.list",
      "instance.get",
      "view.getContext",
      "view.getCollection",
      "view.getVisibleCards",
    ])
    expect(parseApplicationQuery({
      type: "collection.get",
      input: { collectionId: "reading" },
    })).toEqual({
      type: "collection.get",
      input: { collectionId: "reading" },
    })
    expect(parseApplicationQuery({ type: "instance.list", input: {} }))
      .toEqual({ type: "instance.list" })
    expect(parseApplicationQuery({
      type: "source.get",
      input: { sourceId: "github:trending" },
    })).toEqual({
      type: "source.get",
      input: { sourceId: "github:trending" },
    })
  })
})
