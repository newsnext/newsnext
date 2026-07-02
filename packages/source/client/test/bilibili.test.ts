import { myFetch } from "@newsnext/source-shared/utils/fetch"
import { beforeEach, describe, expect, it, vi } from "vitest"
import bilibiliProvider, { fetchBilibiliFollowingVideos } from "../src/lib/bilibili"

vi.mock("@newsnext/source-shared/utils/fetch", () => ({
  myFetch: vi.fn(),
}))

describe("bilibili source", () => {
  beforeEach(() => {
    vi.mocked(myFetch).mockReset()
  })

  it("registers following videos as a timeline source", () => {
    expect(bilibiliProvider.sources["following-videos"]).toMatchObject({
      title: "关注视频",
      type: "timeline",
      home: "https://www.bilibili.com",
    })
  })

  it("loads followed UP videos through the logged-in dynamic feed", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce({
      code: 0,
      data: {
        items: [
          {
            modules: {
              module_author: {
                name: "NewsNext UP",
                face: "https://i0.hdslb.com/bfs/face/avatar.jpg",
                pub_ts: 1782806400,
              },
              module_dynamic: {
                major: {
                  archive: {
                    bvid: "BV1xx411c7mD",
                    title: "A followed video",
                    desc: "Video description",
                    cover: "//i0.hdslb.com/bfs/archive/cover.jpg",
                    jump_url: "//www.bilibili.com/video/BV1xx411c7mD/",
                    stat: {
                      play: "1.2万",
                      danmaku: "345",
                    },
                  },
                },
              },
            },
          },
          {
            modules: {
              module_author: { name: "Text-only UP" },
              module_dynamic: {
                major: {
                  opus: {
                    title: "Not a video",
                  },
                },
              },
            },
          },
        ],
      },
    })

    const items = await fetchBilibiliFollowingVideos()

    expect(myFetch).toHaveBeenCalledTimes(1)
    expect(myFetch).toHaveBeenCalledWith(
      "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all",
      expect.objectContaining({
        credentials: "include",
        query: expect.objectContaining({
          timezone_offset: -480,
          type: "all",
          platform: "web",
          page: 1,
          web_location: "333.1365",
        }),
      }),
    )
    expect(items).toEqual([
      {
        title: "A followed video",
        url: "https://www.bilibili.com/video/BV1xx411c7mD/",
        timestamp: 1782806400000,
        inline: {
          text: "NewsNext UP · 1.2万观看 · 345弹幕",
          icon: {
            src: "https://i0.hdslb.com/bfs/face/avatar.jpg",
            radius: 4,
          },
        },
        preview: {
          text: "Video description",
          picture: "https://i0.hdslb.com/bfs/archive/cover.jpg",
        },
      },
    ])
  })

  it("loads ranking videos for the selected region", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce({
      data: {
        list: [
          {
            bvid: "BV1rank411c7mD",
            title: "A ranking video",
            pubdate: 1782806400,
            owner: {
              name: "Ranking UP",
              face: "https://i0.hdslb.com/bfs/face/ranking.jpg",
            },
            stat: {
              view: 12345,
              like: 678,
            },
            desc: "Ranking description",
            pic: "https://i0.hdslb.com/bfs/archive/ranking.jpg",
          },
        ],
      },
    })

    const rankingSource = bilibiliProvider.sources.ranking
    const items = await rankingSource.loader({ region: "36" })

    expect(rankingSource.params?.region).toMatchObject({
      title: "Region",
      default: "0",
    })
    expect(myFetch).toHaveBeenCalledWith(
      "https://api.bilibili.com/x/web-interface/ranking/v2",
      expect.objectContaining({
        query: {
          rid: "36",
        },
      }),
    )
    expect(items).toEqual([
      {
        title: "A ranking video",
        url: "https://www.bilibili.com/video/BV1rank411c7mD",
        timestamp: 1782806400000,
        inline: {
          text: "1.2w观看 · 678点赞",
          icon: {
            src: "https://i0.hdslb.com/bfs/face/ranking.jpg",
            radius: 4,
          },
        },
        preview: {
          text: "Ranking description",
          picture: "https://i0.hdslb.com/bfs/archive/ranking.jpg",
        },
      },
    ])
  })

  it("surfaces Bilibili API errors", async () => {
    vi.mocked(myFetch).mockResolvedValueOnce({
      code: -101,
      message: "账号未登录",
    })

    await expect(fetchBilibiliFollowingVideos()).rejects.toThrow("账号未登录")
  })
})
