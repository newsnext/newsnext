import type { NativeWorkspace } from "@newsnext/extension-connection"
import { describe, expect, it } from "vitest"
import { applyWorkspacePatch, createWorkspacePatch } from "./workspace-patch"

function workspace(revision: number): NativeWorkspace {
  return {
    revision,
    boards: [
      {
        color: "red",
        createdAt: 1,
        defaultLayer: "now",
        id: "board-a",
        illustration: null,
        instanceIds: ["instance-a"],
        name: "A",
        nowLayer: {
          sort: { automaticMode: "addedAt", manualOrder: [], mode: "addedAt" },
        },
        nextLayer: { widgets: [] },
      },
      {
        color: "blue",
        createdAt: 2,
        defaultLayer: "now",
        id: "board-b",
        illustration: null,
        instanceIds: [],
        name: "B",
        nowLayer: {
          sort: { automaticMode: "addedAt", manualOrder: [], mode: "addedAt" },
        },
        nextLayer: { widgets: [] },
      },
    ],
    instances: [{
      createdAt: 1,
      instanceId: "instance-a",
      patch: {},
      sourceId: "source:a",
    }],
  }
}

describe("workspace patches", () => {
  it("contains only changed entities and preserves explicit order", () => {
    const current = workspace(4)
    const candidate = workspace(4)
    candidate.boards = [{
      ...candidate.boards[1]!,
      color: "green",
      defaultLayer: "next",
      name: "Updated",
    }]
    candidate.instances = []

    const patch = createWorkspacePatch(current, candidate)

    expect(patch).toEqual({
      expectedRevision: 4,
      boardOrder: ["board-b"],
      boards: [candidate.boards[0]],
      instanceOrder: [],
      instances: [],
    })
    expect(applyWorkspacePatch(current, patch)).toEqual({
      ...candidate,
      revision: 5,
    })
  })

  it("rejects patches for stale revisions", () => {
    const current = workspace(4)
    const patch = createWorkspacePatch(current, current)
    patch.expectedRevision = 3

    expect(() => applyWorkspacePatch(current, patch)).toThrow("expected revision 3")
  })
})
