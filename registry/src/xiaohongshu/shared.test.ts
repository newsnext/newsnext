import { describe, expect, it } from "vitest"
import { normalizeSearchItem } from "./search"
import {
  parseXiaohongshuCount,
  parseXiaohongshuInitialState,
  parseXiaohongshuNoteTimestamp,
  sortXiaohongshuItemsByNewest,
  xiaohongshuFeedItemToNewsItem,
} from "./shared"

describe("xiaohongshu helpers", () => {
  it("parses serialized initial state values", () => {
    const state = parseXiaohongshuInitialState(
      "<script>window.__INITIAL_STATE__={\"missing\":undefined,\"map\":new Map([]),\"set\":new Set([])}</script>",
    )
    expect(state).toEqual({ missing: null, map: [], set: [] })
  })

  it("parses localized counts", () => {
    expect(parseXiaohongshuCount("1.2万")).toBe(12_000)
    expect(parseXiaohongshuCount("3千")).toBe(3_000)
    expect(parseXiaohongshuCount("42")).toBe(42)
  })

  it("derives a publication timestamp from a note ID", () => {
    expect(parseXiaohongshuNoteTimestamp("6a943cbe00000000200351d4"))
      .toBe(Date.parse("2026-08-30T14:22:54.000Z"))
    expect(parseXiaohongshuNoteTimestamp("not-a-note-id")).toBeUndefined()
  })

  it("restores chronological order when an older note is pinned first", () => {
    const items = [
      { title: "Pinned", url: "https://example.com/pinned", publishedAt: 1 },
      { title: "Newest", url: "https://example.com/newest", publishedAt: 3 },
      { title: "Older", url: "https://example.com/older", publishedAt: 2 },
    ]

    expect(sortXiaohongshuItemsByNewest(items).map(item => item.title))
      .toEqual(["Newest", "Older", "Pinned"])
  })

  it("maps a note without leaking tokens outside its navigation URL", () => {
    expect(xiaohongshuFeedItemToNewsItem({
      id: "note-id",
      modelType: "note",
      xsecToken: "runtime-token",
      noteCard: {
        displayTitle: " A note ",
        interactInfo: { likedCount: "1.2万" },
        user: { nickname: "Author", userId: "user-id" },
      },
    }, "pc_search")).toMatchObject({
      title: "A note",
      url: "https://www.xiaohongshu.com/explore/note-id?xsec_source=pc_search&xsec_token=runtime-token",
      author: {
        name: "Author",
        home: "https://www.xiaohongshu.com/user/profile/user-id",
      },
      stats: { likes: 12_000 },
    })
  })

  it("normalizes search API snake-case fields", () => {
    expect(normalizeSearchItem({
      id: "note-id",
      model_type: "note",
      note_card: {
        display_title: "Search result",
        interact_info: { liked_count: "88" },
        user: { nickname: "Author", user_id: "user-id" },
      },
      xsec_token: "token",
    })).toEqual({
      id: "note-id",
      modelType: "note",
      noteCard: {
        cover: undefined,
        displayTitle: "Search result",
        interactInfo: {
          collectedCount: undefined,
          commentCount: undefined,
          likedCount: "88",
          sharedCount: undefined,
        },
        time: undefined,
        user: {
          avatar: undefined,
          nickName: undefined,
          nickname: "Author",
          userId: "user-id",
        },
      },
      xsecToken: "token",
    })
  })

  it("normalizes a relative search publication time", () => {
    expect(normalizeSearchItem({
      id: "6a943cbe00000000200351d4",
      model_type: "note",
      note_card: {
        corner_tag_info: [{ type: "publish_time", text: "2小时前" }],
      },
    }, new Date("2026-08-30T14:30:00.000Z")).noteCard?.time)
      .toBe(Date.parse("2026-08-30T12:30:00.000Z"))
  })
})
