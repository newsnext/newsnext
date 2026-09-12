import type { Workspace } from "@/lib/native-protocol/Workspace"
import { describe, expect, it } from "vitest"
import { mergeWorkspaces, needsWorkspaceResolution } from "./workspace-resolution"

function workspace(suffix = "a"): Workspace {
  return {
    revision: 2,
    updatedAt: 100,
    settings: "{\"theme\":\"dark\"}",
    boards: [{
      id: `board-${suffix}`,
      name: suffix,
      createdAt: 1,
      color: "blue",
      defaultLayer: "now",
      cardIds: [`card-${suffix}`],
      nowLayer: { sort: { mode: "addedAt", automaticMode: "addedAt", manualOrder: [`card-${suffix}`] } },
      nextLayer: { liveWidgets: [{
        liveWidgetId: `instance-${suffix}`,
        widgetId: "shared-template",
        dataScope: { type: "cards", cardIds: [`card-${suffix}`] },
        layout: { x: 0, y: 0, width: 2, height: 2 },
      }] },
    }],
    liveCards: [{ cardId: `card-${suffix}`, workerId: `worker-${suffix}`, sourceId: "source:a", createdAt: 1, patch: {} }],
  }
}

describe("workspace connection decisions", () => {
  it("requires a choice for a new browser regardless of which clock is newer", () => {
    const local = workspace("local")
    const shared = workspace("shared")
    expect(needsWorkspaceResolution(local, shared, undefined)).toBe(true)
    local.updatedAt = 1
    expect(needsWorkspaceResolution(local, shared, undefined)).toBe(true)
    local.updatedAt = 1000
    expect(needsWorkspaceResolution(local, shared, undefined)).toBe(true)
  })

  it("reconnects an unchanged mirror but requires a choice for offline edits", () => {
    expect(needsWorkspaceResolution(workspace("local"), workspace("shared"), 100)).toBe(false)
    const local = workspace("local")
    local.updatedAt = 101
    expect(needsWorkspaceResolution(local, workspace("shared"), 100)).toBe(true)
    const same = workspace()
    same.revision = 99
    same.updatedAt = 999
    expect(needsWorkspaceResolution(same, workspace(), undefined)).toBe(false)
  })

  it("preserves both browsers' unique entities and Worker ownership without collapsing templates", () => {
    const shared = workspace()
    const local = workspace("b")
    const before = structuredClone({ shared, local })
    const merged = mergeWorkspaces(shared, local)
    expect(merged.boards.map(board => board.id)).toEqual(["board-a", "board-b"])
    expect(merged.liveCards.map(card => card.workerId)).toEqual(["worker-a", "worker-b"])
    expect(merged.boards.flatMap(board => board.nextLayer.liveWidgets.map(widget => widget.liveWidgetId))).toEqual(["instance-a", "instance-b"])
    expect({ shared, local }).toEqual(before)
    expect(mergeWorkspaces(merged, local)).toEqual(merged)
  })

  it("unions membership on matching Boards and keeps shared conflicting fields", () => {
    const shared = workspace()
    const local = workspace("b")
    local.boards[0]!.id = "board-a"
    local.settings = "{\"theme\":\"light\"}"
    local.liveCards.push({ ...shared.liveCards[0]!, workerId: "changed-owner" })
    local.boards[0]!.cardIds.push("card-a")
    local.boards[0]!.nextLayer.liveWidgets.push({ ...shared.boards[0]!.nextLayer.liveWidgets[0]!, patch: { params: { limit: 9 } } })
    const merged = mergeWorkspaces(shared, local)
    expect(merged.boards).toHaveLength(1)
    expect(merged.boards[0]!.name).toBe("a")
    expect(merged.boards[0]!.cardIds).toEqual(["card-a", "card-b"])
    expect(merged.boards[0]!.nowLayer.sort.manualOrder).toEqual(["card-a", "card-b"])
    expect(merged.boards[0]!.nextLayer.liveWidgets.map(widget => widget.liveWidgetId)).toEqual(["instance-a", "instance-b"])
    expect(merged.liveCards[0]).toEqual(shared.liveCards[0])
    expect(merged.settings).toBe(shared.settings)
  })

  it("keeps shared ownership after local moves and limits new Widget scopes to their resulting Board", () => {
    const shared = workspace()
    const local = workspace("b")
    local.liveCards.push(shared.liveCards[0]!)
    local.boards[0]!.cardIds.push("card-a")
    local.boards[0]!.nextLayer.liveWidgets[0]!.dataScope = { type: "cards", cardIds: ["card-a", "card-b"] }
    local.boards[0]!.nextLayer.liveWidgets.push(shared.boards[0]!.nextLayer.liveWidgets[0]!)
    const merged = mergeWorkspaces(shared, local)
    expect(merged.boards[0]!.cardIds).toEqual(["card-a"])
    expect(merged.boards[1]!.cardIds).toEqual(["card-b"])
    expect(merged.boards[1]!.nextLayer.liveWidgets).toHaveLength(1)
    expect(merged.boards[1]!.nextLayer.liveWidgets[0]!.dataScope).toEqual({ type: "cards", cardIds: ["card-b"] })
  })
})
