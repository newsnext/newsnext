import { describe, expect, it } from "vitest"
import { parseSourceConnectionResponse } from "./session"

describe("source run protocol", () => {
  it("accepts ready metadata", () => {
    expect(parseSourceConnectionResponse({
      type: "ready",
      instance: {
        id: "instance-id",
        browser: "chrome",
        extensionVersion: "0.0.1",
      },
    })).toEqual({
      type: "ready",
      instance: {
        id: "instance-id",
        browser: "chrome",
        extensionVersion: "0.0.1",
      },
    })
  })

  it("preserves structured execution errors", () => {
    expect(parseSourceConnectionResponse({
      id: "request-id",
      type: "source.result",
      ok: false,
      error: {
        name: "SourceLoginRequiredError",
        message: "Source login required.",
        code: "SOURCE_LOGIN_REQUIRED",
        loginUrl: "https://example.com/login",
      },
    })).toMatchObject({
      id: "request-id",
      ok: false,
      error: {
        code: "SOURCE_LOGIN_REQUIRED",
        loginUrl: "https://example.com/login",
      },
    })
  })

  it("rejects malformed responses", () => {
    expect(parseSourceConnectionResponse({
      type: "ready",
      instance: {
        browser: "chrome",
      },
    })).toBeUndefined()
    expect(parseSourceConnectionResponse({
      id: "request-id",
      type: "source.result",
      ok: false,
      error: "failed",
    })).toBeUndefined()
  })
})
