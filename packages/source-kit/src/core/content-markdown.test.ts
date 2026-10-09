import { describe, expect, it } from "vitest"
import { htmlToMarkdown } from "./content-markdown"
import { validateNewsItems, validateSourceLoaderOutput } from "./loader-result"

describe("collected body normalization", () => {
  it("preserves headings, links, images, lists and fenced code", () => {
    const markdown = htmlToMarkdown("<h2>Title</h2><p>Hello <strong>world</strong> <a href=\"/story\">read</a></p><img src=\"/image.png\" alt=\"Image\"><ul><li>One</li><li>Two</li></ul><pre><code class=\"language-js\">const a = 1;</code></pre>", "https://example.com/feed")
    expect(markdown).toContain("## Title")
    expect(markdown).toContain("**world**")
    expect(markdown).toContain("[read](https://example.com/story)")
    expect(markdown).toContain("![Image](https://example.com/image.png)")
    expect(markdown).toMatch(/\* +One\n\* +Two/)
    expect(markdown).toContain("```js\nconst a = 1;\n```")
  })

  it("converts tables to GFM", () => {
    expect(htmlToMarkdown("<table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>1</td></tr></table>")).toContain("| Name | Value |")
  })

  it("converts GFM strikethrough and task lists", () => {
    const markdown = htmlToMarkdown("<p><del>Removed</del></p><ul><li><input type=\"checkbox\" checked>Done</li><li><input type=\"checkbox\">Pending</li></ul>")
    expect(markdown).toContain("~~Removed~~")
    expect(markdown).toContain("[x] Done")
    expect(markdown).toContain("[ ] Pending")
  })

  it("does not retain raw HTML for tables without heading cells", () => {
    const markdown = htmlToMarkdown("<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>")
    expect(markdown).toContain("A")
    expect(markdown).toContain("D")
    expect(markdown).not.toContain("<")
  })

  it("preserves caption-only tables without failing the source", () => {
    expect(htmlToMarkdown("<table><caption>Caption</caption></table>")).toBe("Caption")
  })

  it("escapes pipes inside table cells", () => {
    const markdown = htmlToMarkdown("<table><tr><th>Title</th></tr><tr><td>A | B</td></tr></table>")
    expect(markdown).toContain("A \\| B")
  })

  it("discards active elements and unsafe URLs without retaining raw HTML", () => {
    const markdown = htmlToMarkdown("<script>alert(1)</script><style>body{}</style><iframe src=\"https://example.com\"></iframe><p onclick=\"evil()\">Safe <a href=\"javascript:alert(1)\">link</a></p>")
    expect(markdown).toBe("Safe link")
  })

  it("stores only Markdown while leaving plain text unchanged", () => {
    const result = validateSourceLoaderOutput({ items: [
      { title: "HTML", url: "/story", content: { html: "<p><a href=\"/link\">Link</a></p>" } },
      { title: "Text", url: "/text", content: { text: "*literal*" } },
    ] }, "https://example.com/")
    expect(result.items[0]?.content).toEqual({ markdown: "[Link](https://example.com/link)" })
    expect(result.items[1]?.content).toEqual({ text: "*literal*" })
  })

  it("rejects HTML in final item data without migrating it", () => {
    expect(() => validateNewsItems([{ title: "Old", url: "https://example.com", content: { html: "<p>Old</p>" } }])).toThrow("content.html is not supported")
  })
})
