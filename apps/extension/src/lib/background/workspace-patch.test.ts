import type { NativeWorkspace } from "@newsnext/extension-connection"
import { describe, expect, it } from "vitest"
import {
  applyWorkspacePatch,
  createWorkspacePatch,
  parseWorkspacePatch,
} from "./workspace-patch"

function workspace(revision: number): NativeWorkspace {
  return {
    revision,
    updatedAt: 100,
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
      workerId: "worker-a",
      patch: {},
      sourceId: "source:a",
    }],
    settings: JSON.stringify({ version: 1 }),
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
      updatedAt: candidate.updatedAt,
      boardOrder: ["board-b"],
      boards: [candidate.boards[0]],
      instanceOrder: [],
      instances: [],
      settings: candidate.settings,
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

  it("includes synchronized Settings in every patch", () => {
    const current = workspace(4)
    const candidate = workspace(4)
    candidate.settings = JSON.stringify({
      general: { registryUrls: ["https://example.com/registry.json"] },
      version: 1,
    })

    const patch = createWorkspacePatch(current, candidate)

    expect(patch.settings).toEqual(candidate.settings)
    expect(applyWorkspacePatch(current, patch).settings).toEqual(candidate.settings)
  })

  it("preserves Board references to unchanged Instances when parsing a patch", () => {
    const current = workspace(4)
    const candidate = workspace(4)
    candidate.instances.push({
      createdAt: 2,
      instanceId: "instance-b",
      workerId: "worker-b",
      patch: {},
      sourceId: "source:b",
    })
    candidate.boards[0] = {
      ...candidate.boards[0]!,
      instanceIds: ["instance-b", "instance-a"],
    }

    const patch = parseWorkspacePatch(createWorkspacePatch(current, candidate))

    expect(patch.instances.map(instance => instance.instanceId)).toEqual(["instance-b"])
    expect(patch.boards[0]?.instanceIds).toEqual(["instance-b", "instance-a"])
    expect(applyWorkspacePatch(current, patch).boards[0]?.instanceIds).toEqual([
      "instance-b",
      "instance-a",
    ])
  })
})
