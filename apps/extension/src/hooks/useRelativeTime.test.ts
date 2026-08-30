import { describe, expect, it } from "vitest"
import { formatRelativeTime } from "./useRelativeTime"

const now = new Date("2026-08-30T12:00:00Z")

describe("formatRelativeTime", () => {
  it.each([
    [now.getTime() - 30_000, "now"],
    [now.getTime() - 5 * 60_000, "5m ago"],
    [now.getTime() - 2 * 60 * 60_000, "2h ago"],
    [now.getTime() - 24 * 60 * 60_000, "1d ago"],
    [now.getTime() - 3 * 24 * 60 * 60_000, "3d ago"],
    [now.getTime() - 2 * 7 * 24 * 60 * 60_000, "2w ago"],
    [now.getTime() - 3 * 30 * 24 * 60 * 60_000, "3mo ago"],
    [now.getTime() - 2 * 365 * 24 * 60 * 60_000, "2y ago"],
    [now.getTime() + 5 * 60_000, "in 5m"],
  ])("formats %i as %s", (date, expected) => {
    expect(formatRelativeTime(date, now)).toBe(expected)
  })
})
