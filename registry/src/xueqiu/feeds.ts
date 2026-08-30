import type { ProviderSourceConfig } from "@newsnext/source-kit/registry"
import { requestXueqiuJson } from "./shared"

const postFields = {
  url: "target",
  title: {
    select: "title || description || text",
    template: "{{ scope.value | strip_html | normalize_whitespace | truncate: 120, \"…\" }}",
  },
  publishedAt: "created_at",
  author: {
    name: "user.screen_name",
    home: "user.profile",
  },
  stats: {
    likes: "like_count",
    comments: "reply_count",
    reposts: "retweet_count",
    views: "view_count",
  },
  content: {
    text: {
      select: "description || text",
      template: "{{ scope.value | strip_html | normalize_whitespace }}",
    },
    pictures: "firstImg",
  },
} as const

const watchlistPostFields = {
  ...postFields,
  title: {
    select: "title || description || text",
    template: "{{ scope.value | strip_html | remove: \"网页链接\" | normalize_whitespace | truncate: 120, \"…\" }}",
  },
} as const

export const feedSources = {
  "following": {
    metadata: {
      title: "关注",
      home: "/",
    },
    loader: {
      type: "json",
      url: "https://api.xueqiu.com/v4/statuses/home_timeline.json?source=user",
      request: requestXueqiuJson,
      items: "home_timeline",
      fields: postFields,
    },
    radar: [{
      id: "xueqiu-following",
      match: {
        hosts: ["xueqiu.com"],
        paths: ["/"],
      },
    }],
    capabilities: {
      network: ["xueqiu.com"],
    },
  },
  "hot": {
    metadata: {
      title: "热门",
      home: "/",
      type: "ranking",
    },
    loader: {
      type: "json",
      url: "https://api.xueqiu.com/statuses/hot/listV3.json?source=hot&page=1",
      request: requestXueqiuJson,
      items: "list",
      fields: postFields,
    },
    radar: [{
      id: "xueqiu-hot",
      match: {
        hosts: ["xueqiu.com"],
        paths: ["/"],
      },
    }],
    capabilities: {
      network: ["xueqiu.com"],
    },
  },
  "live-news": {
    metadata: {
      title: "7×24",
      home: "/",
    },
    loader: {
      type: "json",
      url: "/statuses/livenews/list.json?category=6&since_id=-1&count=30",
      items: "items",
      fields: {
        url: {
          select: "target",
          template: "{{ scope.value | regex_replace: \"^http:\", \"https:\" }}",
        },
        title: {
          select: "text",
          template: "{{ scope.value | strip_html | normalize_whitespace | truncate: 120, \"…\" }}",
        },
        publishedAt: "created_at",
        content: {
          text: {
            select: "text",
            template: "{{ scope.value | strip_html | normalize_whitespace }}",
          },
        },
      },
    },
    radar: [{
      id: "xueqiu-live-news",
      match: {
        hosts: ["xueqiu.com"],
        paths: ["/"],
      },
    }],
  },
  "watchlist": {
    metadata: {
      title: "自选",
      home: "/",
    },
    vars: {
      source: {
        all: "news_coll",
        announcements: "公告",
        news: "自选股新闻",
      },
      title: {
        all: "全部",
        announcements: "公告",
        news: "新闻",
      },
    },
    params: {
      filter: {
        type: "select",
        title: "内容",
        values: [
          { label: "全部", value: "all" },
          { label: "公告", value: "announcements" },
          { label: "新闻", value: "news" },
        ],
        default: "all",
      },
    },
    loader: {
      type: "json",
      url: "https://api.xueqiu.com/v4/statuses/home_timeline.json?source={{ source.vars.source[scope.params.filter] | url_query }}",
      request: requestXueqiuJson,
      items: "home_timeline",
      fields: watchlistPostFields,
      metadata: {
        title: {
          template: "自选 | {{ source.vars.title[scope.params.filter] }}",
        },
      },
    },
    radar: [{
      id: "xueqiu-watchlist",
      match: {
        hosts: ["xueqiu.com"],
        paths: ["/"],
      },
      patch: {
        params: {
          filter: () => {
            const page = globalThis as unknown as {
              document: {
                querySelectorAll: (selector: string) => ArrayLike<{
                  classList: { contains: (className: string) => boolean }
                }>
              }
            }
            const controls = Array.from(page.document.querySelectorAll(".timeline__tab__tags a"))
            const activeIndex = controls.findIndex(
              control => control.classList.contains("active"),
            )
            return (["all", "announcements", "news"] as const)[activeIndex] ?? "all"
          },
        },
        metadata: {
          title: "自选 | {{ source.vars.title[scope.params.filter] }}",
        },
      },
    }],
    capabilities: {
      network: ["xueqiu.com"],
    },
  },
} satisfies Record<string, ProviderSourceConfig>
