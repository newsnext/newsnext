import { describe, expect, it } from "vitest"
import { assertIdentity } from "./identity"

describe("source identity", () => {
  it("accepts a validated identity matching the normalized secret", async () => {
    await expect(assertIdentity("42", () => " 42 ", "Test")).resolves.toBeUndefined()
  })

  it("allows an unbound identity and rejects a changed one", async () => {
    await expect(assertIdentity("", () => undefined, "Test")).resolves.toBeUndefined()
    await expect(assertIdentity("42", () => "43", "Test")).rejects.toThrow("signed-in Test user changed")
  })
})
