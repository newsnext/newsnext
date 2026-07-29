import type { ProviderConfig } from "@newsnext/source/registry"
import type { SourceRequestRule } from "@newsnext/source/types"
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
  defaults: {
    capabilities: weiboCapabilities,
    requestRules: weiboRequestRules,
    cache: "5m",
    loader: {
      type: "custom",
    },
    metadata: {
      color: "red",
      category: "china",
      type: "timeline",
      icon: "https://weibo.com/favicon.ico",
    },
  },
  sources: {
    "hot-search": {
      metadata: {
        title: "热搜",
        type: "hottest",
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
              home: "https://weibo.com/hot/{{ scope.path.type }}",
            },
          },
          confidence: 1,
        },
      ],
      loader: {
        type: "json",
        url: "https://weibo.com/ajax/{{ source.vars.endpoint[scope.params.type] }}",
        fetchOptions: {
          credentials: "include",
        },
        items: "(data.realtime || data.band_list)[?is_ad != `1` && (rank != `null` || realpos != `null`)]",
        fields: {
          title: "note || word || name",
          url: {
            select: "url || word_scheme || word",
            template: "{% if scope.item.url %}{{ scope.value | replace: 'http://', 'https://' }}{% else %}https://s.weibo.com/weibo?q={{ scope.value | url_query }}{% endif %}",
          },
          inline: {
            mark: "(icon || icon_url) && {src: icon || icon_url, scale: `1.5`, radius: `0`}",
          },
        },
      },
      cache: {
        version: 4,
        maxAge: "1m",
      },
    },
    "user": {
      metadata: {
        title: "用户微博",
        desc: "指定微博用户发布的最新微博",
        home: "https://weibo.com",
      },
      params: {
        uid: {
          type: "text",
          title: "用户 UID",
          description: "微博用户的数字 UID。",
          default: "1195230310",
          pattern: "^\\d+$",
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
        version: 2,
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
          pattern: ".+",
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
        home: "https://weibo.com",
      },
      params: {
        id: {
          type: "text",
          title: "超话 ID",
          description: "以 100808 开头的微博超话 ID。",
          default: "1008084989d223732bf6f02f75ea30efad58a9",
          pattern: "^100808[A-Za-z0-9]+$",
        },
        type: {
          type: "select",
          title: "排序",
          values: [
            { label: "最新评论", value: "feed" },
            { label: "最新帖子", value: "sort_time" },
            { label: "热门", value: "hot_sort" },
            { label: "精华", value: "soul" },
          ],
          default: "feed",
        },
      },
      radar: [
        {
          id: "weibo-super-topic",
          match: {
            hosts: ["weibo.com"],
            includes: "100808",
          },
          patch: {
            params: {
              id: "{{ scope.query.containerid | default: scope.hashQuery.containerid | regex_extract: '(100808[A-Za-z0-9]+)', 1 }}",
              type: "feed",
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
        home: "https://weibo.com",
      },
      radar: [
        {
          id: "weibo-following",
          match: {
            hosts: ["weibo.com"],
            paths: ["/"],
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
