import { describe, expect, it } from "vitest"
import { assertIdentity } from "./identity"

describe("source identity", () => {
  it("accepts a validated identity matching the normalized secret", async () => {
    await expect(assertIdentity("42", () => " 42 ", "Test")).resolves.toBeUndefined()
  })

  it("rejects missing and changed identities", async () => {
    await expect(assertIdentity("", () => undefined, "Test")).rejects.toThrow("configured Test user")
    await expect(assertIdentity("42", () => "43", "Test")).rejects.toThrow("signed-in Test user changed")
  })
})
