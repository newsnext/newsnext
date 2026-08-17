import type { ProviderConfig } from "@newsnext/source/registry"
import type { SourceRequestRule } from "@newsnext/source/types"
import { identityParam } from "../shared/identity"
import {
  fetchWeiboFollowingTimeline,
  fetchWeiboKeywordPosts,
  fetchWeiboSuperTopicPosts,
  fetchWeiboUserPosts,
} from "./utils"

const weiboCapabilities = {
  network: ["weibo.com", "*.sinaimg.cn"],
}

const weiboSearchCapabilities = {
  network: ["m.weibo.cn", "*.sinaimg.cn"],
}

const weiboRequestRules = [
  {
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        {
          header: "Referer",
          operation: "set",
          value: "https://weibo.com/",
        },
      ],
    },
    condition: {
      requestDomains: ["weibo.com", "sinaimg.cn"],
      resourceTypes: ["image", "xmlhttprequest"],
    },
  },
] satisfies SourceRequestRule[]

const weiboSearchRequestRules = [
  {
    action: {
      type: "modifyHeaders",
      requestHeaders: [
        {
          header: "Referer",
          operation: "set",
          value: "https://weibo.com/",
        },
      ],
    },
    condition: {
      requestDomains: ["m.weibo.cn", "sinaimg.cn"],
      resourceTypes: ["image", "xmlhttprequest"],
    },
  },
] satisfies SourceRequestRule[]

export default {
  title: "微博",
  category: "social",
  icon: "https://weibo.com/favicon.ico",
  color: "red",
  defaults: {
    baseUrl: "https://weibo.com/",
    capabilities: weiboCapabilities,
    requestRules: weiboRequestRules,
    cache: "5m",
    loader: {
      type: "custom",
    },
  },
  sources: {
    "hot-search": {
      metadata: {
        title: "热搜",
      },
      vars: {
        endpoint: {
          search: "side/hotSearch",
          mine: "statuses/mineBand",
          entertainment: "statuses/entertainment",
          social: "statuses/social",
          tech: "statuses/technology",
          life: "statuses/life",
          sports: "statuses/sport",
          acg: "statuses/acg",
        },
      },
      params: {
        type: {
          type: "select",
          title: "类别",
          values: [
            { label: "热搜", value: "search" },
            { label: "好友热搜", value: "mine" },
            { label: "文娱", value: "entertainment" },
            { label: "要闻", value: "social" },
            { label: "科技", value: "tech" },
            { label: "生活", value: "life" },
            { label: "体育", value: "sports" },
            { label: "ACG", value: "acg" },
          ],
          default: "search",
        },
      },
      radar: [
        {
          id: "weibo-hot-search",
          match: {
            hosts: ["weibo.com"],
            paths: ["/hot/:type"],
          },
          patch: {
            params: {
              type: "{{ scope.path.type }}",
            },
            metadata: {
              title: {
                select: "a[aria-current=\"page\"] [title]",
              },
              home: "/hot/{{ scope.path.type }}",
            },
          },
          confidence: 1,
        },
      ],
      loader: {
        type: "json",
        url: "/ajax/{{ source.vars.endpoint[scope.params.type] }}",
        items: "(data.realtime || data.band_list)[?is_ad != `1` && (rank != `null` || realpos != `null`)]",
        fields: {
          title: "note || word || name",
          url: {
            select: "url || word_scheme || word",
            template: "{% if scope.item.url %}{{ scope.value | replace: 'http://', 'https://' }}{% else %}https://s.weibo.com/weibo?q={{ scope.value | url_query }}{% endif %}",
          },
          mark: {
            src: "icon || icon_url",
            kind: { template: "trend" },
            label: "word",
          },
        },
      },
      cache: {
        version: 5,
        maxAge: "1m",
      },
    },
    "user": {
      metadata: {
        title: "用户微博",
        desc: "指定微博用户发布的最新微博",
        home: "/",
      },
      params: {
        uid: {
          type: "text",
          title: "用户 UID",
          description: "微博用户的数字 UID。",
          default: "1195230310",
        },
      },
      radar: [
        {
          id: "weibo-user",
          match: {
            hosts: ["weibo.com"],
            paths: ["/u/:uid", "/profile/:uid", "/:uid"],
          },
          patch: {
            params: {
              uid: "{{ scope.path.uid }}",
            },
            metadata: {
              title: {
                select: "[class*=\"_box1_\"] [class*=\"_h3_\"] > [class*=\"_name_\"]",
              },
            },
          },
          confidence: 0.9,
        },
      ],
      loader: {
        load: fetchWeiboUserPosts,
      },
      cache: {
        version: 3,
        maxAge: "5m",
      },
    },
    "keyword": {
      metadata: {
        title: "关键词",
        desc: "包含指定关键词的最新微博",
        home: "https://s.weibo.com",
      },
      params: {
        keyword: {
          type: "text",
          title: "关键词",
          default: "MSI",
        },
      },
      radar: [
        {
          id: "weibo-keyword",
          match: {
            hosts: ["s.weibo.com"],
          },
          patch: {
            params: {
              keyword: "{{ scope.query.q | default: scope.query.keyword }}",
            },
            metadata: {
              title: "{{ scope.params.keyword }}",
            },
          },
          confidence: 0.9,
        },
      ],
      loader: {
        load: fetchWeiboKeywordPosts,
      },
      capabilities: weiboSearchCapabilities,
      requestRules: weiboSearchRequestRules,
    },
    "super-topic": {
      metadata: {
        title: "超话",
        desc: "指定微博超话的最新帖子",
        home: "/",
      },
      params: {
        id: {
          type: "text",
          title: "超话 ID",
          description: "以 100808 开头的微博超话 ID。",
          default: "1008084989d223732bf6f02f75ea30efad58a9",
        },
      },
      radar: [
        {
          id: "weibo-super-topic",
          match: {
            hosts: ["weibo.com"],
            paths: {
              include: [{ regex: "(?<id>100808[A-Za-z0-9]+)" }],
            },
          },
          patch: {
            params: {
              id: "{{ scope.path.id }}",
            },
            metadata: {
              title: {
                select: "[class*=\"_infoRow_\"] [class*=\"_nameRow_\"] > [class*=\"_name_\"]",
              },
            },
          },
          confidence: 0.9,
        },
      ],
      loader: {
        load: fetchWeiboSuperTopicPosts,
      },
    },
    "following": {
      metadata: {
        title: "关注",
        desc: "所有已关注微博账号发布的最新微博",
        home: "/",
      },
      params: {
        identity: identityParam,
      },
      radar: [
        {
          id: "weibo-following",
          match: {
            hosts: ["weibo.com"],
            paths: ["/"],
          },
          patch: {
            params: {
              identity: () => {
                const page = globalThis as unknown as {
                  document: { documentElement: { innerHTML: string } }
                }
                const match = page.document.documentElement.innerHTML.match(
                  /"uid":\s*(?:"(\d+)"|(\d+))\s*,\s*"apmSampleRate"/,
                )
                return match?.[1] ?? match?.[2]
              },
            },
          },
          confidence: 0.9,
        },
      ],
      loader: {
        load: fetchWeiboFollowingTimeline,
      },
    },
  },
} satisfies ProviderConfig
