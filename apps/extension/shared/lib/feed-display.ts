import type { SelectParameter } from "@newsnext/feeds/typings"
import type { BoardFeed } from "@/typings/feed"

interface FeedDisplay {
  name: string
  title?: string
  home?: string
}

function getNeteasePlaylistParam(feed: BoardFeed): SelectParameter<string> | undefined {
  const param = feed.params?.id
  return param?.type === "select" ? param as SelectParameter<string> : undefined
}

function getNeteasePlaylistId(feed: BoardFeed, params: Record<string, unknown>): string | undefined {
  const playlistParam = getNeteasePlaylistParam(feed)
  const selectedId = params.id

  if (typeof selectedId === "string" && selectedId.length > 0) {
    return selectedId
  }

  return typeof playlistParam?.default === "string" ? playlistParam.default : undefined
}

function getNeteasePlaylistTitle(feed: BoardFeed, playlistId: string | undefined): string | undefined {
  const playlistParam = getNeteasePlaylistParam(feed)
  return playlistParam?.options.find(option => option.value === playlistId)?.label ?? feed.title
}

export function resolveFeedDisplay(feed: BoardFeed, params: Record<string, unknown>): FeedDisplay {
  if (feed.provider !== "netease-music") {
    return {
      name: feed.name,
      title: feed.title,
      home: feed.home,
    }
  }

  const playlistId = getNeteasePlaylistId(feed, params)

  return {
    name: feed.name,
    title: getNeteasePlaylistTitle(feed, playlistId),
    home: playlistId ? `https://music.163.com/#/playlist?id=${playlistId}` : feed.home,
  }
}
