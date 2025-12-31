import { Time } from "../typings/constants"
import { defineJsonSourceFetcher, defineSource } from "../utils/source"

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

interface PlaylistResponse {
  result?: { tracks?: NeteaseTrack[] }
  playlist?: { tracks?: NeteaseTrack[] }
}

const extractTracks = (payload: PlaylistResponse) => {
  const tracks = payload.result?.tracks ?? payload.playlist?.tracks ?? []
  return Array.isArray(tracks) ? tracks.slice(0, 100) : []
}

const formatArtists = (track: NeteaseTrack) => {
  const artists = track.ar ?? track.artists ?? []
  return artists.map(artist => artist.name).filter(Boolean).join(" / ")
}

const extractCover = (track: NeteaseTrack) => track.al?.picUrl ?? track.album?.picUrl

const createPlaylistFetcher = (id: number) => defineJsonSourceFetcher<NeteaseTrack>(() => ({
  url: `https://music.163.com/api/playlist/detail?id=${id}`,
  items: (json: PlaylistResponse) => extractTracks(json),
  fields: {
    title: track => track.name,
    url: track => `https://music.163.com/song?id=${track.id}`,
    meta: {
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
    detail: {
      picture: (track) => {
        const pic = extractCover(track)
        return pic ? { src: pic } : undefined
      },
      iframe: track => ({
        src: `https://notion.busiyi.world/music-player/?server=netease&type=song&id=${track.id}`,
        height: 90,
      }),
    },
  },
}))

export default defineSource({
  name: "网易云音乐",
  home: "https://sg.music.163.com/#/discover/toplist",
  color: "red",
  category: "china",
  type: "hottest",
  interval: Time.Common,
  sub: [
    {
      id: "default",
      title: "云音乐飙升榜",
      home: "https://music.163.com/#/playlist?id=19723756",
      ...createPlaylistFetcher(19723756),
    },
    {
      id: "new-songs",
      title: "云音乐新歌榜",
      home: "https://music.163.com/#/playlist?id=3779629",
      ...createPlaylistFetcher(3779629),
    },
    {
      id: "hot-songs",
      title: "云音乐热歌榜",
      home: "https://music.163.com/#/playlist?id=3778678",
      ...createPlaylistFetcher(3778678),
    },
    {
      id: "douyin",
      title: "抖音排行榜",
      home: "https://music.163.com/#/playlist?id=2250011882",
      ...createPlaylistFetcher(2250011882),
    },
  ],
})
