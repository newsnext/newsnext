import { beforeEach, describe, expect, it, vi } from "vitest"
import linuxdoProvider from "../src/lib/linuxdo"
import { myFetch } from "../src/utils/fetch"

vi.mock("../src/utils/fetch", () => ({
  myFetch: vi.fn(),
}))

const topic = {
  id: 123,
  title: "Linux.do topic",
  fancy_title: "Linux.do topic",
  posts_count: 2,
  reply_count: 1,
  highest_post_number: 2,
  image_url: null,
  created_at: "2026-06-28T00:00:00.000Z",
  last_posted_at: "2026-06-28T01:00:00.000Z",
  bumped: true,
  bumped_at: "2026-06-28T01:00:00.000Z",
  unseen: false,
  pinned: false,
  excerpt: "Preview",
  visible: true,
  closed: false,
  archived: false,
  like_count: 3,
  has_summary: false,
  last_poster_username: "ada",
  category_id: 1,
  pinned_globally: false,
}

describe("linuxdo source", () => {
  beforeEach(() => {
    vi.mocked(myFetch).mockReset()
  })

  it("uses the last poster avatar as the latest topic icon", async () => {
    vi.mocked(myFetch).mockResolvedValue({
      users: [
        {
          username: "ada",
          avatar_template: "/user_avatar/linux.do/ada/{size}/1_2.png",
        },
      ],
      topic_list: {
        can_create_topic: false,
        more_topics_url: "/latest?order=created&page=1",
        per_page: 30,
        top_tags: [],
        topics: [topic],
      },
    })

    const items = await linuxdoProvider.sources.latest.loader({})

    expect(myFetch).toHaveBeenCalledWith("https://linux.do/latest.json?order=created", undefined)
    expect(items).toEqual([
      {
        title: "Linux.do topic",
        timestamp: Date.parse("2026-06-28T00:00:00.000Z"),
        url: "https://linux.do/t/topic/123",
        inline: {
          text: "",
          icon: {
            src: "https://linux.do/user_avatar/linux.do/ada/48/1_2.png",
            radius: 999,
          },
        },
      },
    ])
  })

  it("uses the last poster avatar as the hot topic icon", async () => {
    vi.mocked(myFetch).mockResolvedValue({
      users: [
        {
          username: "ada",
          avatar_template: "https://linux.do/user_avatar/linux.do/ada/{size}/1_2.png",
        },
      ],
      topic_list: {
        can_create_topic: false,
        more_topics_url: "/top/daily?page=1",
        per_page: 30,
        top_tags: [],
        topics: [topic],
      },
    })

    const items = await linuxdoProvider.sources.hot.loader({})

    expect(myFetch).toHaveBeenCalledWith("https://linux.do/top/daily.json", undefined)
    expect(items).toEqual([
      {
        title: "Linux.do topic",
        url: "https://linux.do/t/topic/123",
        inline: {
          text: "",
          icon: {
            src: "https://linux.do/user_avatar/linux.do/ada/48/1_2.png",
            radius: 999,
          },
        },
      },
    ])
  })
})
