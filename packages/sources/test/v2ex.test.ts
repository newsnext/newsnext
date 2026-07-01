import { describe, expect, it, vi } from "vitest"
import { providers } from "../src"
import { myFetch } from "../src/utils/fetch"

vi.mock("../src/utils/fetch", () => ({
  myFetch: vi.fn(),
}))

describe("v2ex source", () => {
  it("uses a single selectable JSON feed", async () => {
    const source = providers.v2ex.sources.feed

    expect(source.params).toHaveProperty("feed")
    expect(source.params).not.toHaveProperty("feeds")
    expect(source.params?.feed).toMatchObject({
      type: "select",
      default: "ideas",
    })

    vi.mocked(myFetch).mockResolvedValue({
      items: [
        {
          title: "V2EX item",
          url: "https://www.v2ex.com/t/1",
          content_html: "<p>Hello</p>",
          date_published: "2026-06-28T00:00:00.000Z",
          author: {
            avatar: "https://cdn.v2ex.com/avatar.png",
          },
        },
      ],
    })

    const items = await source.loader({ feed: "programmer" })

    expect(myFetch).toHaveBeenCalledOnce()
    expect(myFetch).toHaveBeenCalledWith("https://www.v2ex.com/feed/programmer.json", undefined)
    expect(items).toEqual([
      {
        title: "V2EX item",
        url: "https://www.v2ex.com/t/1",
        timestamp: Date.parse("2026-06-28T00:00:00.000Z"),
        inline: {
          icon: "https://cdn.v2ex.com/avatar.png",
        },
        preview: {
          html: "<p>Hello</p>",
        },
      },
    ])
  })
})
