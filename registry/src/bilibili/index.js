import { followingSource, userDynamicsSource } from "./dynamics.js"
import { favoriteSources } from "./favorites.js"
import { rankingSource } from "./ranking.js"
import { searchSource } from "./search.js"
import { upSources } from "./up.js"
/** @type {import("@newsnext/sdk/source/registry").ProviderConfig} */
export default {
  title: "哔哩哔哩",
  category: "social",
  color: "red",
  icon: "https://i0.hdslb.com/bfs/static/jinkela/long/images/512.png",
  defaults: {
    baseUrl: "https://www.bilibili.com/",
    metadata: {
      home: "/",
    },
  },
  sources: {
    ...upSources,
    "hotword": {
      version: 3,
      metadata: {
        title: "热搜",
        type: "ranking",
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
}
