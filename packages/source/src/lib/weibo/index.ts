import type { ProviderConfig } from "@newsnext/source/utils/source"
import {
  fetchWeiboFollowingTimeline,
  fetchWeiboKeywordPosts,
  fetchWeiboSuperTopicPosts,
  fetchWeiboUserPosts,
  optionalWeiboCookieSecrets,
  requiredWeiboCookieSecrets,
} from "./utils"

const weiboCapabilities = {
  network: ["m.weibo.cn"],
  cookies: ["m.weibo.cn"],
}

export default {
  title: "Weibo",
  home: "https://s.m.weibo.cn/top/summary?cate=realtimehot",
  color: "red",
  category: "china",
  sources: {
    "hot-search": {
      metadata: {
        title: "Hot Search",
        type: "hottest",
      },
      loader: {
        type: "html",
        url: "https://s.m.weibo.cn/top/summary?cate=realtimehot",
        items: "#pl_top_realtimehot table tbody tr:nth-child(n+2)",
        filter: ":not(:has(.ranktop:contains('•')))",
        fields: {
          title: "td.td-02 a",
          url: {
            select: "td.td-02 a",
            attr: "href",
            template: "{{ value | absolute_url: requestUrl }}",
          },
          inline: {
            mark: "td.td-03",
          },
        },
      },
      cache: "5m",
    },
    "user": {
      metadata: {
        title: "User Posts",
        desc: "Latest posts from a specified Weibo user",
        type: "timeline",
        home: "https://m.weibo.cn",
      },
      params: {
        uid: {
          type: "text",
          title: "User ID",
          description: "Numeric Weibo uid.",
          default: "1195230310",
          pattern: "^\\d+$",
        },
      },
      radar: [
        {
          id: "weibo-user",
          match: {
            hosts: ["m.weibo.cn", "weibo.com"],
            paths: ["/u/:uid", "/profile/:uid", "/:uid"],
          },
          patch: {
            params: {
              uid: "{{ path.uid }}",
            },
            metadata: {
              title: "{{ page.title | normalize_whitespace | regex_extract: '^@(.+)\\\\s*的个人主页', 1 | regex_replace: '[-_—|].*微博.*$', '' | regex_replace: '的微博.*$', '' | default: params.uid }}",
            },
          },
          confidence: 0.9,
        },
      ],
      secrets: optionalWeiboCookieSecrets,
      loader: {
        type: "custom",
        load: fetchWeiboUserPosts,
      },
      capabilities: weiboCapabilities,
      cache: "5m",
    },
    "keyword": {
      metadata: {
        title: "Keyword",
        desc: "Latest Weibo posts matching a keyword",
        type: "timeline",
        home: "https://m.weibo.cn",
      },
      params: {
        keyword: {
          type: "text",
          title: "Keyword",
          default: "MSI",
          pattern: ".+",
        },
      },
      radar: [
        {
          id: "weibo-keyword",
          match: {
            hosts: ["s.weibo.com", "s.m.weibo.cn"],
          },
          patch: {
            params: {
              keyword: "{{ query.q | default: query.keyword }}",
            },
            metadata: {
              title: "{{ params.keyword }}",
            },
          },
          confidence: 0.9,
        },
      ],
      secrets: optionalWeiboCookieSecrets,
      loader: {
        type: "custom",
        load: fetchWeiboKeywordPosts,
      },
      capabilities: weiboCapabilities,
      cache: "5m",
    },
    "super-topic": {
      metadata: {
        title: "Super Topic",
        desc: "Latest posts from a Weibo super topic",
        type: "timeline",
        home: "https://m.weibo.cn",
      },
      params: {
        id: {
          type: "text",
          title: "Super Topic ID",
          description: "A 100808... Weibo super topic ID.",
          default: "1008084989d223732bf6f02f75ea30efad58a9",
          pattern: "^100808[A-Za-z0-9]+$",
        },
        type: {
          type: "select",
          title: "Type",
          values: [
            { label: "Latest comments", value: "feed" },
            { label: "Latest posts", value: "sort_time" },
            { label: "Hot", value: "hot_sort" },
            { label: "Featured", value: "soul" },
          ],
          default: "feed",
        },
      },
      radar: [
        {
          id: "weibo-super-topic",
          match: {
            hosts: ["m.weibo.cn", "weibo.com"],
            includes: "100808",
          },
          patch: {
            params: {
              id: "{{ query.containerid | default: hashQuery.containerid | regex_extract: '(100808[A-Za-z0-9]+)', 1 }}",
              type: "feed",
            },
            metadata: {
              title: "{{ page.title | normalize_whitespace | regex_replace: '[-_—|].*微博.*$', '' | regex_replace: '的微博.*$', '' | regex_extract: '^#?(.+?)超话#?$', 1 | default: params.id }}",
            },
          },
          confidence: 0.9,
        },
      ],
      secrets: optionalWeiboCookieSecrets,
      loader: {
        type: "custom",
        load: fetchWeiboSuperTopicPosts,
      },
      capabilities: weiboCapabilities,
      cache: "5m",
    },
    "following": {
      metadata: {
        title: "Following Timeline",
        desc: "Latest posts from all followed Weibo accounts",
        type: "timeline",
        home: "https://m.weibo.cn",
      },
      secrets: requiredWeiboCookieSecrets,
      loader: {
        type: "custom",
        load: fetchWeiboFollowingTimeline,
      },
      capabilities: weiboCapabilities,
      cache: "5m",
    },
  },
} satisfies ProviderConfig
