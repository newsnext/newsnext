import { describe, expect, it } from "vitest"
import { commandScore } from "./command-score"

describe("command score", () => {
  it("prefers exact and prefix matches", () => {
    expect(commandScore("news", "news")).toBeGreaterThan(commandScore("newsletter", "news"))
    expect(commandScore("newsletter", "news")).toBeGreaterThan(commandScore("daily news", "news"))
  })

  it("matches case-insensitively", () => {
    expect(commandScore("Hacker News", "hacker")).toBeGreaterThan(0)
  })

  it("includes keywords in matching", () => {
    expect(commandScore("source-id", "technology", ["Technology News"])).toBeGreaterThan(0)
    expect(commandScore("source-id", "unrelated", ["Technology News"])).toBe(0)
  })
})
