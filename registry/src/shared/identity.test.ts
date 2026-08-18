import { describe, expect, it } from "vitest"
import { assertIdentity } from "./identity"

describe("source identity", () => {
  it("accepts the same normalized identity", async () => {
    await expect(assertIdentity(" NewsNext ", () => "newsnext", "Test")).resolves.toBeUndefined()
  })

  it("allows an unbound identity and rejects a changed one", async () => {
    await expect(assertIdentity("", () => undefined, "Test")).resolves.toBeUndefined()
    await expect(assertIdentity("saved", () => "current", "Test")).rejects.toThrow("signed-in Test user changed")
  })
})
