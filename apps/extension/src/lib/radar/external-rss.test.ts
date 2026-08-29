import { describe, expect, it } from "vitest"
import {
  consumeExternalRssRadarOpenRequest,
  stageExternalRssRadarIntent,
} from "./external-rss"

describe("stageExternalRssRadarIntent", () => {
  it("stages a direct NewsNext feed intent and removes its query", () => {
    expect(stageExternalRssRadarIntent(
      "/app.html",
      "?feed=https%3A%2F%2Fexample.com%2Ffeed.xml?format=rss",
      "#/board/example",
    )).toBe("/app.html#/board/example")
    expect(consumeExternalRssRadarOpenRequest()).toEqual({
      feedUrl: "https://example.com/feed.xml?format=rss",
    })
  })

  it("does not support the CheckChan hash convention", () => {
    expect(stageExternalRssRadarIntent(
      "/app.html",
      "?/index.html",
      "#/check/add?title=Example&url=https%3A%2F%2Fexample.com%2Ffeed.xml&type=rss",
    )).toBeUndefined()
    expect(stageExternalRssRadarIntent("/app.html", "", "#/board/example"))
      .toBeUndefined()
  })

  it.each([
    [
      "add_feed",
      "?/?add_feed=https%3A%2F%2Frsshub.rss3.workers.dev%2Fdedao%2Fknowledge",
    ],
    [
      "url_rss",
      "?/i/?c=feed&a=add&url_rss=https%3A%2F%2Frsshub.rss3.workers.dev%2Fdedao%2Fknowledge",
    ],
    [
      "feed_url",
      "?/public.php?op=bookmarklets--subscribe&feed_url=https%3A%2F%2Frsshub.rss3.workers.dev%2Fdedao%2Fknowledge",
    ],
  ])("supports the %s subscription URL convention", (_, search) => {
    const hash = "#/board/2oxGHlh_QwT2"

    expect(stageExternalRssRadarIntent("/app.html", search, hash))
      .toBe("/app.html#/board/2oxGHlh_QwT2")
    expect(consumeExternalRssRadarOpenRequest()).toEqual({
      feedUrl: "https://rsshub.rss3.workers.dev/dedao/knowledge",
    })
  })

  it("stages invalid input as a one-shot error intent", () => {
    expect(stageExternalRssRadarIntent("/app.html", "?feed=not-a-url"))
      .toBe("/app.html#/")
    expect(consumeExternalRssRadarOpenRequest()).toEqual({
      message: "The RSS feed URL is invalid.",
    })
    expect(consumeExternalRssRadarOpenRequest()).toBeUndefined()
  })

  it("stages an empty feed parameter as a one-shot error intent", () => {
    expect(stageExternalRssRadarIntent("/app.html", "?feed="))
      .toBe("/app.html#/")
    expect(consumeExternalRssRadarOpenRequest()).toEqual({
      message: "No RSS feed URL was provided.",
    })
  })

  it("rejects non-HTTP feed URLs", () => {
    expect(stageExternalRssRadarIntent(
      "/app.html",
      "?feed=file%3A%2F%2F%2Ftmp%2Ffeed.xml",
    )).toBe("/app.html#/")
    expect(consumeExternalRssRadarOpenRequest()).toEqual({
      message: "The RSS feed URL must use HTTP or HTTPS.",
    })
  })
})
