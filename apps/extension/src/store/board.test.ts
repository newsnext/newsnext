import { createStore } from "jotai"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  boardInstancesAtom,
  boardStarIdsAtom,
  deleteInstanceAtom,
  instancesAtom,
  instanceStarredAtom,
  starIdsAtom,
  starInstanceAtom,
  upsertInstanceAtom,
} from "./board"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("board store selectors", () => {
  it("returns stable board selector atoms", () => {
    expect(boardInstancesAtom("featured")).toBe(boardInstancesAtom("featured"))
    expect(boardStarIdsAtom("stars")).toBe(boardStarIdsAtom("stars"))
  })

  it("exposes custom instances to board selectors", () => {
    const store = createStore()
    const instancesSelectorAtom = boardInstancesAtom("forks")
    const customInstance = {
      instanceId: "github::fork_abc",
      sourceId: "github",
      paramsPatch: { tag: "react" },
      origin: "fork" as const,
      createdAt: 2,
      updatedAt: 2,
    }
    let notificationCount = 0

    const unsubscribe = store.sub(instancesSelectorAtom, () => {
      notificationCount += 1
    })

    store.set(instancesAtom, [customInstance])
    expect(notificationCount).toBe(1)
    expect(store.get(instancesSelectorAtom)).toEqual([customInstance])

    unsubscribe()
  })

  it("notifies only when the selected star state changes", () => {
    const store = createStore()
    const isGithubStarredAtom = instanceStarredAtom("github")
    const featuredStarIdsAtom = boardStarIdsAtom("featured")
    let cardNotificationCount = 0
    let boardNotificationCount = 0

    const unsubscribeCard = store.sub(isGithubStarredAtom, () => {
      cardNotificationCount += 1
    })
    const unsubscribeBoard = store.sub(featuredStarIdsAtom, () => {
      boardNotificationCount += 1
    })

    store.set(starIdsAtom, ["v2ex"])
    expect(cardNotificationCount).toBe(0)
    expect(boardNotificationCount).toBe(0)
    expect(store.get(isGithubStarredAtom)).toBe(false)

    store.set(starIdsAtom, ["v2ex", "github"])
    expect(cardNotificationCount).toBe(1)
    expect(boardNotificationCount).toBe(0)
    expect(store.get(isGithubStarredAtom)).toBe(true)

    unsubscribeCard()
    unsubscribeBoard()
  })

  it("skips source instance notifications for idempotent upserts", () => {
    const store = createStore()
    const sourceInstance = {
      instanceId: "github::fork_abc",
      sourceId: "github",
      paramsPatch: {},
      origin: "fork" as const,
      createdAt: 1,
      updatedAt: 1,
    }
    let notificationCount = 0

    const unsubscribe = store.sub(instancesAtom, () => {
      notificationCount += 1
    })

    store.set(upsertInstanceAtom, sourceInstance)
    expect(notificationCount).toBe(1)

    store.set(upsertInstanceAtom, sourceInstance)
    expect(notificationCount).toBe(1)

    unsubscribe()
  })

  it("keeps star and delete writes idempotent", () => {
    const store = createStore()
    let starNotificationCount = 0

    const unsubscribeStars = store.sub(starIdsAtom, () => {
      starNotificationCount += 1
    })

    store.set(starInstanceAtom, { instanceId: "github", starred: true })
    expect(starNotificationCount).toBe(1)

    store.set(starInstanceAtom, { instanceId: "github", starred: true })
    expect(starNotificationCount).toBe(1)

    store.set(deleteInstanceAtom, "github")
    expect(store.get(starIdsAtom)).toEqual([])
    expect(starNotificationCount).toBe(2)

    store.set(deleteInstanceAtom, "github")
    expect(starNotificationCount).toBe(2)

    unsubscribeStars()
  })

  it("hydrates persisted board state before the first write", async () => {
    vi.resetModules()

    const existingInstance = {
      instanceId: "github::fork_existing",
      sourceId: "github",
      paramsPatch: { tag: "react" },
      origin: "fork" as const,
      createdAt: 1,
      updatedAt: 1,
    }
    const newInstance = {
      instanceId: "github::fork_new",
      sourceId: "github",
      paramsPatch: { tag: "vue" },
      origin: "fork" as const,
      createdAt: 2,
      updatedAt: 2,
    }
    const storedValues: Record<string, string> = {
      "newsnext-source-instances": JSON.stringify([existingInstance]),
      "newsnext-starred-source-instance-ids": JSON.stringify([existingInstance.instanceId]),
    }
    const localStorageMock = {
      getItem: vi.fn((key: string) => storedValues[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storedValues[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete storedValues[key]
      }),
    }

    vi.stubGlobal("window", {
      localStorage: localStorageMock,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const board = await import("./board")
    const store = createStore()

    store.set(board.upsertInstanceAtom, newInstance)
    store.set(board.starInstanceAtom, { instanceId: newInstance.instanceId, starred: true })

    expect(store.get(board.instancesAtom)).toEqual([existingInstance, newInstance])
    expect(store.get(board.starIdsAtom)).toEqual([existingInstance.instanceId, newInstance.instanceId])
  })
})
