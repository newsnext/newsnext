import { describe, expect, it } from "vitest"
import { isSourceRequestProtected } from "./query-policy"

describe("source query policy", () => {
  it("protects all Source requests for one minute", () => {
    const updatedAt = 1_000_000

    expect(isSourceRequestProtected(updatedAt, updatedAt + 59_999)).toBe(true)
    expect(isSourceRequestProtected(updatedAt, updatedAt + 60_000)).toBe(false)
  })
})
