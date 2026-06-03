import { describe, expect, it } from "vitest"
import { getApiHealth } from "./health"

describe("getApiHealth", () => {
  it("returns the API health payload", () => {
    expect(getApiHealth()).toEqual({ name: "newsnext-api", ok: true })
  })
})
