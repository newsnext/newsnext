import type { SelectParameter } from "@newsnext/sources/typings"
import type { BoardSource } from "@/typings/source"

export interface SourceDisplay {
  providerTitle: string
  title?: string
  home?: string
}

function getNeteasePlaylistParam(source: BoardSource): SelectParameter<string> | undefined {
  const param = source.params?.id
  return param?.type === "select" ? param as SelectParameter<string> : undefined
}

function getNeteasePlaylistId(source: BoardSource, params: Record<string, unknown>): string | undefined {
  const playlistParam = getNeteasePlaylistParam(source)
  const selectedId = params.id

  if (typeof selectedId === "string" && selectedId.length > 0) {
    return selectedId
  }

  return typeof playlistParam?.default === "string" ? playlistParam.default : undefined
}

function getNeteasePlaylistTitle(source: BoardSource, playlistId: string | undefined): string | undefined {
  const playlistParam = getNeteasePlaylistParam(source)
  return playlistParam?.options.find(option => option.value === playlistId)?.label ?? source.title
}

export function resolveSourceDisplay(source: BoardSource, params: Record<string, unknown>): SourceDisplay {
  if (source.provider !== "netease-music") {
    return {
      providerTitle: source.providerTitle,
      title: source.title,
      home: source.home,
    }
  }

  const playlistId = getNeteasePlaylistId(source, params)

  return {
    providerTitle: source.providerTitle,
    title: getNeteasePlaylistTitle(source, playlistId),
    home: playlistId ? `https://music.163.com/#/playlist?id=${playlistId}` : source.home,
  }
}
