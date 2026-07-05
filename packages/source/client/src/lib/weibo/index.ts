import { $selectParam, $textParam } from "@newsnext/source-shared/utils/params"
import { $provider, $source } from "@newsnext/source-shared/utils/source"
import {
  fetchWeiboFollowingTimeline,
  fetchWeiboKeywordPosts,
  fetchWeiboSuperTopicPosts,
  fetchWeiboUserPosts,
  normalizeWeiboSuperTopicId,
  normalizeWeiboUid,
  optionalWeiboCookieSecrets,
  requiredWeiboCookieSecrets,
} from "./utils"

const baseurl = "https://s.m.weibo.cn"
const flagUrls = {
  新: "https://simg.s.m.weibo.cn/moter/flags/1_0.png",
  热: "https://simg.s.m.weibo.cn/moter/flags/2_0.png",
  爆: "https://simg.s.m.weibo.cn/moter/flags/4_0.png",
}

export default $provider({
  title: "Weibo",
  home: "https://s.m.weibo.cn/top/summary?cate=realtimehot",
  color: "red",
  sources: [
    $source.html(
      {
        key: "hot-search",
        title: "Hot Search",
        type: "hottest",
      },
      () => ({
        url: "https://s.m.weibo.cn/top/summary?cate=realtimehot",
        items: $ => $("#pl_top_realtimehot table tbody tr:nth-child(n+2)").filter((_, el) => $(el).find(".ranktop").text() !== "•"),
        fields: {
          title: "td.td-02 a",
          url: {
            selector: "td.td-02 a",
            attr: "href",
            transform: href => `${baseurl}${href}`,
          },
          inline: {
            mark: {
              selector: "td.td-03",
              transform: (val) => {
                const flagUrl = flagUrls[val as keyof typeof flagUrls]
                if (!flagUrl) return undefined
                return { src: flagUrl, scale: 1.5 }
              },
            },
          },
        },
      }),
    ),
    $source(
      {
        key: "user",
        title: "User Posts",
        desc: "Latest posts from a specified Weibo user",
        type: "timeline",
        home: "https://m.weibo.cn",
        secrets: optionalWeiboCookieSecrets,
        radar: [
          {
            id: "weibo-user",
            match: {
              hosts: ["m.weibo.cn", "weibo.com"],
              paths: ["/u/:uid", "/profile/:uid"],
            },
            title: {
              type: "value",
              value: { type: "pageTitle" },
              transforms: [
                { type: "normalizeWhitespace" },
                { type: "extract", pattern: "^@(.+)\\s*的个人主页" },
                { type: "replace", pattern: "[-_—|].*微博.*$", replacement: "" },
                { type: "replace", pattern: "的微博.*$", replacement: "" },
              ],
              fallback: "User {uid}",
            },
            params: {
              uid: { value: { type: "path", name: "uid" }, pattern: "^\\d+$" },
            },
            confidence: 0.9,
          },
        ],
        params: {
          uid: $textParam({
            title: "User ID",
            description: "Numeric uid, or a Weibo profile URL containing the uid.",
            default: "1195230310",
            parse: value => normalizeWeiboUid(String(value)),
            validate: value => /^\d+$/.test(value) || "User ID must be numeric.",
          }),
        },
      },
      fetchWeiboUserPosts,
    ),
    $source(
      {
        key: "keyword",
        title: "Keyword",
        desc: "Latest Weibo posts matching a keyword",
        type: "timeline",
        home: "https://m.weibo.cn",
        secrets: optionalWeiboCookieSecrets,
        radar: [
          {
            id: "weibo-keyword",
            match: { hosts: ["s.weibo.com", "s.m.weibo.cn"] },
            title: { type: "param", name: "keyword" },
            params: {
              keyword: {
                value: { type: "first", values: [{ type: "query", name: "q" }, { type: "query", name: "keyword" }] },
                required: true,
              },
            },
            confidence: 0.9,
          },
        ],
        params: {
          keyword: $textParam({
            title: "Keyword",
            default: "MSI",
            parse: value => String(value).trim(),
            validate: value => value.length > 0 || "Keyword must not be empty.",
          }),
        },
      },
      fetchWeiboKeywordPosts,
    ),
    $source(
      {
        key: "super-topic",
        title: "Super Topic",
        desc: "Latest posts from a Weibo super topic",
        type: "timeline",
        home: "https://m.weibo.cn",
        secrets: optionalWeiboCookieSecrets,
        radar: [
          {
            id: "weibo-super-topic",
            match: { hosts: ["m.weibo.cn", "weibo.com"] },
            title: {
              type: "value",
              value: { type: "pageTitle" },
              transforms: [
                { type: "normalizeWhitespace" },
                { type: "replace", pattern: "[-_—|].*微博.*$", replacement: "" },
                { type: "replace", pattern: "的微博.*$", replacement: "" },
                { type: "extract", pattern: "^#?(.+?)超话#?$" },
              ],
              fallback: "{id}",
            },
            params: {
              id: {
                value: { type: "first", values: [{ type: "query", name: "containerid" }, { type: "hashQuery", name: "containerid" }, { type: "pathSegmentWithPrefix", prefix: "100808" }] },
                startsWith: "100808",
              },
              type: { type: "literal", value: "feed" },
            },
            confidence: 0.9,
          },
        ],
        params: {
          id: $textParam({
            title: "Super topic ID",
            description: "A 100808... super topic ID, or a Weibo super topic URL containing it.",
            default: "1008084989d223732bf6f02f75ea30efad58a9",
            parse: value => normalizeWeiboSuperTopicId(String(value)),
            validate: value => value.length > 0 || "Super topic ID must not be empty.",
          }),
          type: $selectParam({
            title: "Type",
            options: [
              { label: "Latest comments", value: "feed" },
              { label: "Latest posts", value: "sort_time" },
              { label: "Hot", value: "hot_sort" },
              { label: "Featured", value: "soul" },
            ],
            default: "feed",
          }),
        },
      },
      fetchWeiboSuperTopicPosts,
    ),
    $source(
      {
        key: "following",
        title: "Following Timeline",
        desc: "Latest posts from all followed Weibo accounts",
        type: "timeline",
        home: "https://m.weibo.cn",
        secrets: requiredWeiboCookieSecrets,
      },
      fetchWeiboFollowingTimeline,
    ),
  ],
})
