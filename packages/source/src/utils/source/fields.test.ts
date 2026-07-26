import { describe, expect, it } from "vitest"
import { applyFieldTransforms } from "./fields"

describe("source field transforms", () => {
  it("normalizes multiline text and selects the first non-empty line", () => {
    const value = applyFieldTransforms(
      " \n First line \n\n Second line \n ",
      [
        { type: "normalizeLines", separator: "\n\n" },
        { type: "firstLine" },
      ],
    )

    expect(value).toBe("First line")
  })

  it("truncates by Unicode code point and includes the omission", () => {
    expect(applyFieldTransforms(
      "😀😀😀😀",
      [{ type: "truncate", length: 3 }],
    )).toBe("😀😀…")
  })

  it("extracts quoted and unquoted CSS URLs", () => {
    expect(applyFieldTransforms(
      "background-image: url('https://example.com/quoted.jpg')",
      [{ type: "extractCssUrl" }],
    )).toBe("https://example.com/quoted.jpg")

    expect(applyFieldTransforms(
      "background: URL( https://example.com/unquoted.jpg ) center",
      [{ type: "extractCssUrl" }],
    )).toBe("https://example.com/unquoted.jpg")
  })
})
