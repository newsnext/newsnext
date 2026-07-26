import type { ProviderConfig } from "@newsnext/source/utils/source"

const DEFAULT_PLAYLIST_ID = "19723756"

const getPlaylistHome = (id: string): string => `https://music.163.com/#/playlist?id=${id}`

export default {
  title: "网易云音乐",
  home: "https://sg.music.163.com/#/discover/toplist",
  color: "red",
  sources: {
    playlist: {
      title: "飙升榜",
      type: "hottest",
      home: getPlaylistHome(DEFAULT_PLAYLIST_ID),
      params: {
        id: {
          type: "text",
          default: DEFAULT_PLAYLIST_ID,
          title: "Playlist",
          pattern: "^\\d+$",
          transforms: [{ type: "trim" }],
        },
      },
      radar: [
        {
          id: "netease-music-playlist",
          match: {
            hosts: ["music.163.com", "y.music.163.com"],
            includes: ["playlist", "toplist"],
          },
          patch: {
            metadata: {
              title: "{% assign title = page.title | normalize_whitespace | regex_extract: '^(.+?)\\\\s*-\\\\s*(?:歌单|排行榜)\\\\s*-\\\\s*网易云音乐$', 1 %}{% if title != empty %}{{ title }}{% else %}Playlist {{ params.id }}{% endif %}",
            },
          },
          confidence: 0.95,
        },
      ],
      loader: {
        type: "json",
        url: "https://music.163.com/api/playlist/detail?id={{ params.id | url_query }}",
        items: "(result.tracks || playlist.tracks)[:100]",
        fields: {
          title: "name",
          url: {
            select: "id",
            template: "https://music.163.com/song?id={{ value | url_query }}",
          },
          inline: {
            text: {
              template: "{% assign artists = item.ar | default: item.artists %}{% for artist in artists %}{% unless forloop.first %} / {% endunless %}{{ artist.name }}{% endfor %}{% assign album = item.al.name | default: item.album.name %}{% if artists and album %} · {% endif %}{{ album | default: '' }}",
            },
            icon: "al.picUrl || album.picUrl",
          },
          preview: {
            picture: "al.picUrl || album.picUrl",
          },
        },
      },
      cache: "15m",
    },
  },
} satisfies ProviderConfig
