import { validateSourceLoaderOutput } from "@newsnext/source-kit/core"
import { describe, expect, it } from "vitest"
import { parseZhihuColumn, parseZhihuFollowing, resolveZhihuUrl } from "./shared"

describe("zhihu content links", () => {
  it("prefers returned webpage URLs and preserves their query", () => {
    expect(resolveZhihuUrl({ type: "article", id: "1", url: "https://zhuanlan.zhihu.com/p/2" }))
      .toBe("https://zhuanlan.zhihu.com/p/2")
    expect(resolveZhihuUrl({ type: "pin", id: "1", url: "/pin/2?native=0" }))
      .toBe("https://www.zhihu.com/pin/2?native=0")
    expect(resolveZhihuUrl({ type: "new_type", url: "https://www.zhihu.com/question/2" }))
      .toBe("https://www.zhihu.com/question/2")
  })
  it("resolves API resource URLs and missing URLs using exact string IDs", () => {
    const id = "1999999999999999999"
    expect(resolveZhihuUrl({ type: "answer", id, question: { id: "42" }, url: `https://api.zhihu.com/answers/${id}` }))
      .toBe(`https://www.zhihu.com/question/42/answer/${id}`)
    expect(resolveZhihuUrl({ type: "article", id })).toBe(`https://zhuanlan.zhihu.com/p/${id}`)
    expect(resolveZhihuUrl({ type: "question", id })).toBe(`https://www.zhihu.com/question/${id}`)
    expect(resolveZhihuUrl({ type: "zvideo", id })).toBe(`https://www.zhihu.com/zvideo/${id}`)
  })
  it("skips unresolvable content rather than producing broken links", () => {
    for (const content of [
      { type: "answer", id: "2" },
      { type: "article", id: Number.MAX_SAFE_INTEGER + 1 },
      { type: "article", id: "not-an-id" },
      { type: "unknown", id: "2", url: "https://api.zhihu.com/answers/2" },
      { url: "https://www.zhihu.com/api/v4/questions/2" },
      { url: "https://www.zhihu.com.evil.example/question/2" },
      { url: "https://user:password@www.zhihu.com/question/2" },
      { url: "javascript:alert(1)" },
    ]) {
      expect(resolveZhihuUrl(content)).toBeUndefined()
    }
  })
})
describe("zhihu mixed content", () => {
  it("parses column answers and articles, filtering unsupported or untitled entries", () => {
    const items = parseZhihuColumn({ data: [
      { type: "answer", id: "2", question: { id: "1", title: "Question" }, created_time: 100, voteup_count: 0 },
      { type: "article", id: "3", title: "Article", url: "https://zhuanlan.zhihu.com/p/3", excerpt: "Excerpt", author: { name: "Author" } },
      { type: "unknown", id: "4", title: "Unknown" },
      { type: "pin", id: "5" },
    ] })
    expect(validateSourceLoaderOutput({ items }).items).toMatchObject([
      { title: "Question", url: "https://www.zhihu.com/question/1/answer/2", publishedAt: 100000, stats: { score: 0 } },
      { title: "Article", url: "https://zhuanlan.zhihu.com/p/3", author: { name: "Author" }, content: { text: "Excerpt" } },
    ])
  })
  it("preserves grouped feed ordering, cleans text, and uses activity timestamps", () => {
    const items = parseZhihuFollowing({ data: [
      { type: "feed_group", list: [{ type: "feed", target: { type: "pin", id: "3", excerpt: "Grouped" } }] },
      { type: "ad", target: { type: "article", id: "4", title: "Ad" } },
      {
        type: "feed",
        created_time: 200,
        action_text: "Liked",
        target: {
          type: "answer",
          id: "2",
          question: { id: "1", title: " <b>Question</b>  title " },
          excerpt: "<p>Some &amp; text</p>",
          created_time: 100,
          voteup_count: 10,
          reaction: { statistics: { applaud_count: 0, comment_count: 0, favorites: 0, like_count: 0 } },
        },
      },
      { type: "feed" },
    ] })
    const result = validateSourceLoaderOutput({ items }).items
    expect(result.map(item => item.title)).toEqual(["Question title", "Grouped"])
    expect(result[0]).toMatchObject({
      publishedAt: 200000,
      content: { text: "Some &amp; text" },
      attributes: { activity: "Liked" },
      stats: { score: 0, comments: 0, stars: 0, likes: 0 },
    })
  })
  it("bounds excerpt-derived titles while preserving the body", () => {
    const excerpt = "x".repeat(200)
    const [item] = parseZhihuFollowing({ data: [{ type: "feed", target: { type: "pin", id: "1", excerpt } }] })
    expect(item?.title).toBe(`${"x".repeat(159)}…`)
    expect(item?.content?.text).toBe(excerpt)
  })
})
