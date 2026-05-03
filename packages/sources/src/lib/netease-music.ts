import { Time } from "../typings/constants"
import { $selectParam } from "../utils/params"
import { $provider, $source } from "../utils/source"

interface NeteaseArtist {
  name?: string
}

interface NeteaseAlbum {
  name?: string
  picUrl?: string
}

interface NeteaseTrack {
  id: number
  name: string
  ar?: NeteaseArtist[]
  artists?: NeteaseArtist[]
  al?: NeteaseAlbum
  album?: NeteaseAlbum
}

interface PlaylistPayload {
  tracks?: NeteaseTrack[]
  name?: string
}

interface PlaylistResponse {
  result?: PlaylistPayload
  playlist?: PlaylistPayload
}

const NETEASE_PLAYLIST_OPTIONS = [
  { label: "云音乐飙升榜", value: "19723756" },
  { label: "云音乐新歌榜", value: "3779629" },
  { label: "云音乐热歌榜", value: "3778678" },
  { label: "抖音排行榜", value: "2250011882" },
] as const

type NeteasePlaylistId = (typeof NETEASE_PLAYLIST_OPTIONS)[number]["value"]

const DEFAULT_PLAYLIST_ID: NeteasePlaylistId = "19723756"

const getPlaylistHome = (id: string): string => `https://music.163.com/#/playlist?id=${id}`

const extractTracks = (payload: PlaylistResponse): NeteaseTrack[] => {
  const tracks = payload.result?.tracks ?? payload.playlist?.tracks ?? []
  return Array.isArray(tracks) ? tracks.slice(0, 100) : []
}

const formatArtists = (track: NeteaseTrack): string => {
  const artists = track.ar ?? track.artists ?? []
  return artists.map(artist => artist.name).filter(Boolean).join(" / ")
}

const extractCover = (track: NeteaseTrack): string | undefined => track.al?.picUrl ?? track.album?.picUrl

export default $provider({
  name: "网易云音乐",
  home: "https://sg.music.163.com/#/discover/toplist",
  color: "red",
  sources: {
    default: $source.json(
      {
        title: "排行榜",
        type: "hottest",
        interval: Time.Common,
        home: getPlaylistHome(DEFAULT_PLAYLIST_ID),
        params: {
          id: $selectParam<NeteasePlaylistId>({
            options: [...NETEASE_PLAYLIST_OPTIONS],
            default: DEFAULT_PLAYLIST_ID,
            title: "Playlist",
          }),
        },
      },
      ({ id }) => ({
        url: `https://music.163.com/api/playlist/detail?id=${id}`,
        items: (json: PlaylistResponse) => extractTracks(json),
        fields: {
          title: track => track.name,
          url: track => `https://music.163.com/song?id=${track.id}`,
          inline: {
            text: (track) => {
              const artists = formatArtists(track)
              const album = track.al?.name ?? track.album?.name
              return [artists, album].filter(Boolean).join(" · ")
            },
            icon: (track) => {
              const pic = extractCover(track)
              return pic ? { src: pic, radius: 6 } : undefined
            },
          },
          preview: {
            picture: (track) => {
              const pic = extractCover(track)
              return pic ? { src: pic } : undefined
            },
            iframe: track => ({
              src: `https://music.163.com/outchain/player?type=2&id=${track.id}&auto=1&height=66`,
              height: 90,
            }),
          },
        },
      }),
    ),
  },
})
