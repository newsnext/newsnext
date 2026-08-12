import { describe, expect, it } from "vitest"
import { CliError } from "./errors"
import { parseJsonListOptions } from "./json-list"

describe("jSON list options", () => {
  it("parses output and connection options", () => {
    expect(parseJsonListOptions([
      "--compact",
      "--browser",
      "chrome",
      "--timeout",
      "12",
    ])).toEqual({
      compact: true,
      connection: {
        browser: "chrome",
        timeoutMs: 12_000,
        wsUrl: new URL("ws://127.0.0.1:43110/"),
      },
    })
  })

  it("rejects positional arguments", () => {
    expect(() => parseJsonListOptions(["extra"]))
      .toThrowError(new CliError("Unexpected positional argument: extra", 2))
  })
})
