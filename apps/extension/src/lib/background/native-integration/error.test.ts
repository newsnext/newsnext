import { describe, expect, it } from "vitest"
import { serializeNativeIntegrationError } from "./error"

describe("serializeNativeIntegrationError", () => {
  it("preserves actionable login error metadata", () => {
    const error = Object.assign(new Error("Source login required."), {
      name: "SourceLoginRequiredError",
      code: "SOURCE_LOGIN_REQUIRED",
      loginUrl: "https://example.com/login",
    })

    expect(serializeNativeIntegrationError(error)).toMatchObject({
      name: "SourceLoginRequiredError",
      message: "Source login required.",
      code: "SOURCE_LOGIN_REQUIRED",
      loginUrl: "https://example.com/login",
    })
  })
})
