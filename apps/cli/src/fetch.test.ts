import { describe, expect, it } from "vitest"
import { CliError } from "./errors"
import { parseFetchOptions } from "./fetch"

describe("fetch options", () => {
  it("creates a browser fetch request with repeated headers", () => {
    const options = parseFetchOptions([
      "https://example.com/api",
      "-H",
      "Accept: application/json",
      "--header=X-Test: yes",
      "--body",
      "{}",
      "--include",
    ])

    expect(options.include).toBe(true)
    expect(options.request).toMatchObject({
      type: "fetch",
      url: "https://example.com/api",
      method: "POST",
      headers: [
        ["Accept", "application/json"],
        ["X-Test", "yes"],
      ],
      body: "{}",
    })
  })

  it("rejects unsupported URLs and GET request bodies", () => {
    expect(() => parseFetchOptions(["file:///tmp/example"]))
      .toThrow("Fetch URL must be an HTTP(S) URL")
    expect(() => parseFetchOptions([
      "https://example.com",
      "--method",
      "GET",
      "--body",
      "data",
    ])).toThrow("GET requests cannot have a body")
  })

  it("reports option errors as usage errors", () => {
    expect.assertions(2)
    try {
      parseFetchOptions(["https://example.com", "--header", "invalid"])
    } catch (error) {
      expect(error).toBeInstanceOf(CliError)
      expect((error as CliError).exitCode).toBe(2)
    }
  })
})
