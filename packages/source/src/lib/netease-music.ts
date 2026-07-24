import { normalizeTextParam } from "@newsnext/source/utils/params"
import { $radar, first, hashQuery, pageTitle, query } from "@newsnext/source/utils/radar"
import { $provider, $source } from "@newsnext/source/utils/source"

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

const DEFAULT_PLAYLIST_ID = "19723756"

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
  title: "网易云音乐",
  home: "https://sg.music.163.com/#/discover/toplist",
  color: "red",
  sources: [
    $source({
      metadata: {
        key: "playlist",
        title: "飙升榜",
        type: "hottest",
        home: getPlaylistHome(DEFAULT_PLAYLIST_ID),
      },
      params: {
        id: {
          type: "text",
          default: DEFAULT_PLAYLIST_ID,
          title: "Playlist",
          pattern: "^\\d+$",
          parse: normalizeTextParam,
        },
      },
      radar: [
        $radar({
          id: "netease-music-playlist",
          hosts: ["music.163.com", "y.music.163.com"],
          includes: ["playlist", "toplist"],
          meta: {
            title: pageTitle()
              .normalize()
              .extract("^(.+?)\\s*-\\s*(?:歌单|排行榜)\\s*-\\s*网易云音乐$", { fallbackToEmpty: true })
              .fallback("Playlist {id}"),
          },
          params: {
            id: first(query("id"), hashQuery("id")),
          },
          confidence: 0.95,
        }),
      ],
      loader: {
        type: "json",
        url: ({ id }) => `https://music.163.com/api/playlist/detail?id=${id}`,
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
          },
        },
      },
      capabilities: {
        network: ["music.163.com"],
        cookies: [],
        browser: [],
      },
      cache: { version: 1, maxAge: "15m" },
    }),
  ],
})
