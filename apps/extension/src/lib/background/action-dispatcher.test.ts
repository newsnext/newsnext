import { beforeEach, describe, expect, it } from "vitest"
import {
  clearBackgroundActions,
  dispatchBackgroundAction,
  listBackgroundActions,
  subscribeBackgroundActions,
} from "./action-dispatcher"

describe("background action dispatcher", () => {
  beforeEach(clearBackgroundActions)

  it("records successful actions", async () => {
    const result = await dispatchBackgroundAction({
      commandId: "command-1",
      input: { boardId: "board-1" },
      name: "board.update",
      origin: "ui",
    }, () => ({ boardId: "board-1" }))

    expect(result).toEqual({ boardId: "board-1" })
    expect(listBackgroundActions()).toMatchObject([{
      commandId: "command-1",
      input: { boardId: "board-1" },
      name: "board.update",
      origin: "ui",
      result: { boardId: "board-1" },
      status: "success",
    }])
  })

  it("records a projected diagnostic result", async () => {
    const result = await dispatchBackgroundAction({
      input: undefined,
      name: "fetch",
      origin: "cli",
    }, () => ({ body: "secret", status: 200 }), {
      result: response => ({
        body: "[redacted]",
        status: response.status,
      }),
    })

    expect(result.body).toBe("secret")
    expect(listBackgroundActions()[0]?.result).toEqual({
      body: "[redacted]",
      status: 200,
    })
  })

  it("records failures and preserves rejection", async () => {
    const execution = dispatchBackgroundAction({
      input: { instanceId: "missing" },
      name: "instance.load",
      origin: "ui",
    }, () => {
      throw new Error("Instance not found")
    })

    await expect(execution).rejects.toThrow("Instance not found")
    expect(listBackgroundActions()[0]).toMatchObject({
      error: "Instance not found",
      name: "instance.load",
      status: "error",
    })
  })

  it("keeps only the newest one hundred actions", async () => {
    for (let index = 0; index < 105; index += 1) {
      await dispatchBackgroundAction({
        input: { index },
        name: "test.run",
        origin: "ui",
      }, () => index)
    }

    const actions = listBackgroundActions()
    expect(actions).toHaveLength(100)
    expect(actions[0]?.input).toEqual({ index: 104 })
    expect(actions.at(-1)?.input).toEqual({ index: 5 })
  })

  it("notifies subscribers when action records change", async () => {
    const statuses: string[] = []
    const unsubscribe = subscribeBackgroundActions(() => {
      statuses.push(listBackgroundActions()[0]?.status ?? "empty")
    })

    await dispatchBackgroundAction({
      input: undefined,
      name: "test.run",
      origin: "ui",
    }, () => undefined)
    clearBackgroundActions()
    unsubscribe()

    expect(statuses).toEqual(["running", "success", "empty"])
  })
})
