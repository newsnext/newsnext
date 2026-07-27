import { describe, expect, it } from "vitest"
import { getLoginUrlFromError } from "./source-login-error"

describe("getLoginUrlFromError", () => {
  it("reads structured source login errors", () => {
    const error = Object.assign(new Error("Source login required."), {
      code: "SOURCE_LOGIN_REQUIRED",
      loginUrl: " https://x.com ",
    })

    expect(getLoginUrlFromError(error)).toBe("https://x.com")
  })

  it("reads login URLs from compatible error messages", () => {
    expect(getLoginUrlFromError(new Error("Please log in to https://x.com first.")))
      .toBe("https://x.com")
  })

  it("ignores ordinary source errors", () => {
    expect(getLoginUrlFromError(new Error("Network request failed."))).toBeUndefined()
  })
})
