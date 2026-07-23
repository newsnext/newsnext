import { beforeEach, describe, expect, it, vi } from "vitest"
import { myFetch } from "../fetch"
import { $source } from "./index"

vi.mock("../fetch", () => ({
  myFetch: vi.fn(),
}))

describe("$rssHubSourceLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should not request RSSHub sorting for hottest sources", async () => {
    ;(myFetch as any).mockResolvedValue({
      title: "Test",
      home_page_url: "https://example.com",
      description: "Test",
      items: [
        {
          id: "1",
          url: "https://example.com/1",
          title: "Item 1",
          content_html: "",
          date_published: "2026-01-01T00:00:00.000Z",
        },
      ],
    })

    const source = $source.rssHub(
      {
        key: "test",
        type: "hottest",
      },
      () => ({
        route: "/test",
      }),
    )

    await (source as any).loader({})

    const fetchedUrl = new URL((myFetch as any).mock.calls[0][0])
    expect(fetchedUrl.searchParams.get("format")).toBe("json")
    expect(fetchedUrl.searchParams.get("sorted")).toBe("false")
  })
})
