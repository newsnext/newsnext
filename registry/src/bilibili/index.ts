import type { ProviderConfig } from "@newsnext/source-kit/registry"
import { followingSource, userDynamicsSource } from "./dynamics"
import { favoriteSources } from "./favorites"
import { rankingSource } from "./ranking"
import { searchSource } from "./search"
import { upSources } from "./up"

export default {
  title: "哔哩哔哩",
  category: "social",
  color: "red",
  icon: "https://i0.hdslb.com/bfs/static/jinkela/long/images/512.png",
  defaults: {
    baseUrl: "https://www.bilibili.com/",
    cache: "5m",
    metadata: {
      home: "/",
    },
  },
  sources: {
    ...upSources,
    "hotword": {
      metadata: {
        title: "热搜",
      },
      loader: {
        type: "json",
        url: "https://s.search.bilibili.com/main/hotword?limit=30",
        items: "list",
        fields: {
          title: "show_name",
          url: {
            select: "keyword",
            template: "https://search.bilibili.com/all?keyword={{ scope.value | url_query }}",
          },
          mark: {
            src: "icon",
            kind: { template: "trend" },
            label: "show_name",
          },
        },
      },
    },
    "search": searchSource,
    "following": followingSource,
    "user-dynamics": userDynamicsSource,
    ...favoriteSources,
    "ranking": rankingSource,
  },
} satisfies ProviderConfig
