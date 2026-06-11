import { createStore } from "jotai"
import { describe, expect, it } from "vitest"
import {
  selectBoardSourceInstancesAtom,
  selectBoardStarredSourceInstanceIdsAtom,
  selectIsSourceInstanceStarredAtom,
  sourceInstancesAtom,
  starredSourceInstanceIdsAtom,
} from "./board"

describe("board store selectors", () => {
  it("returns stable board selector atoms", () => {
    expect(selectBoardSourceInstancesAtom("featured")).toBe(selectBoardSourceInstancesAtom("featured"))
    expect(selectBoardStarredSourceInstanceIdsAtom("stars")).toBe(selectBoardStarredSourceInstanceIdsAtom("stars"))
  })

  it("does not notify featured board subscribers when only fork instances change", () => {
    const store = createStore()
    const featuredSourceInstancesAtom = selectBoardSourceInstancesAtom("featured")
    const baseInstance = {
      instanceId: "github",
      sourceKey: "github",
      params: {},
      isFork: false,
      createdAt: 1,
    }
    const forkInstance = {
      instanceId: "github::fork:abc",
      sourceKey: "github",
      params: { tag: "react" },
      isFork: true,
      createdAt: 2,
    }
    let notificationCount = 0

    const unsubscribe = store.sub(featuredSourceInstancesAtom, () => {
      notificationCount += 1
    })

    store.set(sourceInstancesAtom, [baseInstance])
    expect(notificationCount).toBe(1)
    expect(store.get(featuredSourceInstancesAtom)).toEqual([baseInstance])

    store.set(sourceInstancesAtom, [baseInstance, forkInstance])
    expect(notificationCount).toBe(1)
    expect(store.get(featuredSourceInstancesAtom)).toEqual([baseInstance])

    unsubscribe()
  })

  it("notifies only when the selected star state changes", () => {
    const store = createStore()
    const isGithubStarredAtom = selectIsSourceInstanceStarredAtom("github")
    const featuredStarredSourceInstanceIdsAtom = selectBoardStarredSourceInstanceIdsAtom("featured")
    let cardNotificationCount = 0
    let boardNotificationCount = 0

    const unsubscribeCard = store.sub(isGithubStarredAtom, () => {
      cardNotificationCount += 1
    })
    const unsubscribeBoard = store.sub(featuredStarredSourceInstanceIdsAtom, () => {
      boardNotificationCount += 1
    })

    store.set(starredSourceInstanceIdsAtom, ["v2ex"])
    expect(cardNotificationCount).toBe(0)
    expect(boardNotificationCount).toBe(0)
    expect(store.get(isGithubStarredAtom)).toBe(false)

    store.set(starredSourceInstanceIdsAtom, ["v2ex", "github"])
    expect(cardNotificationCount).toBe(1)
    expect(boardNotificationCount).toBe(0)
    expect(store.get(isGithubStarredAtom)).toBe(true)

    unsubscribeCard()
    unsubscribeBoard()
  })
})
