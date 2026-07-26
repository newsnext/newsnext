import type { ProviderConfig } from "@newsnext/source/utils/source"
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

export default {
  title: "Weibo",
  color: "red",
  category: "china",
  icon: "https://weibo.com/favicon.ico",
  sources: {
    "hot-search": {
      metadata: {
        title: "Hot Search",
        type: "hottest",
      },
      params: {
        type: {
          type: "select",
          title: "Type",
          values: [
            { label: "Hot Search", value: "search" },
            { label: "My Hot Search", value: "mine" },
            { label: "Entertainment", value: "entertainment" },
            { label: "Social", value: "social" },
            { label: "Technology", value: "tech" },
            { label: "Life", value: "life" },
            { label: "Sports", value: "sports" },
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
              type: "{{ path.type }}",
            },
            metadata: {
              title: "{{ page.title | regex_replace: '\\\\s*-\\\\s*微博$', '' | default: 'Hot Search' }}",
              home: "https://weibo.com/hot/{{ path.type }}",
            },
          },
          confidence: 1,
        },
      ],
      loader: {
        type: "json",
        url: "https://weibo.com/ajax/{% case params.type %}{% when 'search' %}side/hotSearch{% when 'mine' %}statuses/mineBand{% when 'tech' %}statuses/technology{% when 'sports' %}statuses/sport{% else %}statuses/{{ params.type }}{% endcase %}",
        fetchOptions: {
          credentials: "include",
        },
        items: "(data.realtime || data.band_list)[?is_ad != `1` && (rank != `null` || realpos != `null`)]",
        fields: {
          title: "note || word || name",
          url: {
            select: "url || word_scheme || word",
            template: "{% if item.url %}{{ value | replace: 'http://', 'https://' }}{% else %}https://s.weibo.com/weibo?q={{ value | url_query }}{% endif %}",
          },
          inline: {
            text: {
              select: "num || description",
              template: "{% if value %}{{ value }}{% elsif item.icon_desc %}{{ item.icon_desc }}{% endif %}",
            },
            mark: "(icon || icon_url) && {src: icon || icon_url, scale: `1.5`, radius: `0`}",
          },
        },
      },
      capabilities: weiboCapabilities,
      cache: {
        version: 3,
        maxAge: "1m",
      },
    },
    "user": {
      metadata: {
        title: "User Posts",
        desc: "Latest posts from a specified Weibo user",
        type: "timeline",
        home: "https://weibo.com",
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
            hosts: ["weibo.com"],
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
        home: "https://s.weibo.com",
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
            hosts: ["s.weibo.com"],
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
      loader: {
        type: "custom",
        load: fetchWeiboKeywordPosts,
      },
      capabilities: weiboSearchCapabilities,
      cache: "5m",
    },
    "super-topic": {
      metadata: {
        title: "Super Topic",
        desc: "Latest posts from a Weibo super topic",
        type: "timeline",
        home: "https://weibo.com",
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
            hosts: ["weibo.com"],
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
        type: "custom",
        load: fetchWeiboFollowingTimeline,
      },
      capabilities: weiboCapabilities,
      cache: "5m",
    },
  },
} satisfies ProviderConfig
