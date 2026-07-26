import type { SourceRegistryConfig } from "../utils/source"
import jsonSources from "@newsnext/registry" with { type: "json" }
import { beforeEach, describe, expect, it, vi } from "vitest"
import { myFetch } from "../utils/fetch"
import { resolveRegistrySource } from "../utils/source"

vi.mock("../utils/fetch", () => ({
  myFetch: vi.fn(),
}))

describe("linux.do source", () => {
  beforeEach(() => {
    vi.mocked(myFetch).mockReset()
  })

  it("selects visible topics and resolves poster avatars declaratively", async () => {
    vi.mocked(myFetch).mockResolvedValue({
      topic_list: {
        topics: [
          {
            archived: false,
            created_at: "2024-01-01T00:00:00Z",
            id: 42,
            last_poster_username: "alice",
            pinned: false,
            title: "Visible topic",
            visible: true,
          },
          {
            archived: false,
            id: 43,
            last_poster_username: "bob",
            pinned: true,
            title: "Pinned topic",
            visible: true,
          },
        ],
      },
      users: [
        {
          avatar_template: "/user_avatar/linux.do/alice/{size}/1.png",
          username: "alice",
        },
      ],
    })

    const source = resolveRegistrySource(
      "linuxdo:latest",
      jsonSources["linuxdo:latest"] as SourceRegistryConfig,
    )
    const items = await source.loader({})

    expect(items).toEqual([
      {
        title: "Visible topic",
        url: "https://linux.do/t/topic/42",
        timestamp: 1704067200000,
        inline: {
          icon: "https://linux.do/user_avatar/linux.do/alice/48/1.png",
        },
      },
    ])
  })
})
