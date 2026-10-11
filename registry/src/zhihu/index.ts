import type { ProviderConfig } from "@newsnext/source-kit/registry"
import type { SourceLoaderContext, SourceLoaderOutput } from "@newsnext/source-kit/types"
import type { ZhihuContent, ZhihuFeed, ZhihuResponse } from "./shared"
import { parseZhihuColumn, parseZhihuFollowing, ZHIHU_ORIGIN } from "./shared"

export default {
  title: "知乎",
  category: "forum",
  color: "blue",
  defaults: {
    baseUrl: "https://www.zhihu.com/",
    vars: {
      ringSortLabels: {
        new: "最新",
        hot: "最热",
      },
    },
    metadata: {
      home: "/",
    },
  },
  sources: {
    "column": {
      version: 3,
      capabilities: { network: ["www.zhihu.com"] },
      metadata: {
        title: "专栏",
      },
      params: {
        columnId: {
          type: "text",
          title: "专栏 ID",
          default: "c_155611518",
          required: true,
          validate: {
            regex: "^[A-Za-z0-9_-]{1,100}$",
          },
        },
      },
      radar: [
        {
          id: "zhihu-column",
          match: {
            hosts: [
              "zhihu.com",
            ],
            paths: [
              "/column/:columnId",
            ],
          },
          patch: {
            params: {
              columnId: "{{ scope.path.columnId }}",
            },
            metadata: {
              title: {
                select: "meta[property='og:title']",
                attr: "content",
              },
              home: "/column/{{ scope.params.columnId | url_path }}",
            },
          },
        },
        {
          id: "zhihu-column-short",
          match: {
            hosts: [
              "zhuanlan.zhihu.com",
            ],
            paths: [
              "/:columnId",
            ],
          },
          patch: {
            params: {
              columnId: "{{ scope.path.columnId }}",
            },
            metadata: {
              title: {
                select: "meta[property='og:title']",
                attr: "content",
              },
              home: "https://zhuanlan.zhihu.com/{{ scope.params.columnId | url_path }}",
            },
          },
        },
      ],
      loader: {
        type: "custom",
        load: async ({ columnId }: { columnId: string }, context: SourceLoaderContext): Promise<SourceLoaderOutput> => {
          const response = await context.fetch.get(`${ZHIHU_ORIGIN}/api/v4/columns/${encodeURIComponent(columnId)}/items`, {
            searchParams: { limit: 50 },
          }).json<ZhihuResponse<ZhihuContent>>()
          return {
            items: parseZhihuColumn(response),
            metadata: { home: `${ZHIHU_ORIGIN}/column/${encodeURIComponent(columnId)}` },
          }
        },
        annotation: "{{ scope.item.author.name }}",
      },
    },
    "following": {
      version: 3,
      capabilities: { network: ["www.zhihu.com"] },
      metadata: {
        title: "关注动态",
        home: "/follow",
      },
      loader: {
        type: "custom",
        load: async (_params: Record<string, unknown>, context: SourceLoaderContext): Promise<SourceLoaderOutput> => {
          const response = await context.fetch.get(`${ZHIHU_ORIGIN}/api/v3/moments`, {
            searchParams: { limit: 50, desktop: true },
          }).json<ZhihuResponse<ZhihuFeed>>()
          return { items: parseZhihuFollowing(response) }
        },
        annotation: "{{ scope.item.attributes.activity }}",
      },
    },
    "member-answers": {
      version: 3,
      metadata: {
        title: "用户回答",
      },
      params: {
        userId: {
          type: "text",
          title: "用户 ID",
          default: "ourongxing",
          required: true,
          validate: {
            regex: "^[A-Za-z0-9_-]{1,100}$",
          },
        },
      },
      radar: [
        {
          id: "zhihu-member-answers",
          match: {
            hosts: [
              "zhihu.com",
            ],
            paths: [
              "/people/:userId/answers",
            ],
          },
          patch: {
            params: {
              userId: "{{ scope.path.userId }}",
            },
            metadata: {
              title: {
                select: ".ProfileHeader-name",
                template: "{{ scope.value }} 的回答",
              },
              badge: {
                select: ".UserAvatar-inner",
                attr: "src",
              },
              home: "/people/{{ scope.params.userId | url_path }}/answers",
            },
          },
        },
      ],
      loader: {
        type: "json",
        url: "/api/v4/members/{{ scope.params.userId | url_path }}/answers",
        items: "data",
        metadata: {
          title: {
            select: "data[0].author.name",
            template: "{{ scope.value }} 的回答",
          },
          badge: "data[0].author.avatar_url",
          home: {
            template: "/people/{{ scope.params.userId | url_path }}/answers",
          },
        },
        fields: {
          title: {
            select: "excerpt || question.title",
            transform: [
              "strip_html",
              "normalize_whitespace",
              {
                op: "truncate",
                length: 160,
                suffix: "…",
              },
            ],
          },
          url: {
            select: "id",
            template: "/question/{{ scope.item.question.id }}/answer/{{ scope.value }}",
          },
          publishedAt: {
            select: "created_time",
            transform: "seconds_to_ms",
          },
          author: {
            name: "author.name",
          },
          stats: {
            score: "voteup_count || reaction.statistics.like_count",
            comments: "comment_count",
          },
          icon: {
            src: "author.avatar_url",
            kind: {
              template: "author",
            },
            label: "author.name",
          },
          content: {
            text: "excerpt",
          },
        },
        annotation: "{{ scope.item.author.name }}",
        query: {
          limit: "50",
          sort_by: "created",
          include: "data[*].excerpt,voteup_count,comment_count",
        },
      },
    },
    "question-answers": {
      version: 5,
      vars: {
        sortLabels: { default: "回答", created: "最新回答" },
        sortTypes: { default: "ranking", created: "list" },
      },
      metadata: {
        title: "问题回答",
      },
      params: {
        questionId: {
          type: "text",
          title: "问题 ID",
          default: "1983553349228987887",
          required: true,
          validate: {
            format: "digits",
          },
        },
        sort: {
          type: "select",
          title: "排序",
          values: [
            {
              label: "默认",
              value: "default",
            },
            {
              label: "最新",
              value: "created",
            },
          ],
          default: "default",
        },
      },
      radar: [
        {
          id: "zhihu-question-answers-sort",
          match: {
            hosts: [
              "zhihu.com",
            ],
            paths: [
              "/question/:questionId",
              "/question/:questionId/answer/:answerId",
            ],
            query: [
              "sort_by",
            ],
          },
          patch: {
            params: {
              questionId: "{{ scope.path.questionId }}",
              sort: "{{ scope.query.sort_by }}",
            },
            metadata: {
              title: {
                select: ".QuestionHeader-title",
                template: "{{ scope.value }} | {{ source.vars.sortLabels[scope.params.sort] }}",
              },
              home: "/question/{{ scope.params.questionId | url_path }}?sort_by={{ scope.params.sort | url_query }}",
              type: "{{ source.vars.sortTypes[scope.params.sort] }}",
            },
          },
        },
        {
          id: "zhihu-question-answers",
          match: {
            hosts: [
              "zhihu.com",
            ],
            paths: [
              "/question/:questionId",
              "/question/:questionId/answer/:answerId",
            ],
          },
          patch: {
            params: {
              questionId: "{{ scope.path.questionId }}",
            },
            metadata: {
              title: {
                select: ".QuestionHeader-title",
                template: "{{ scope.value }} | 回答",
              },
              home: "/question/{{ scope.params.questionId | url_path }}?sort_by=default",
              type: "ranking",
            },
          },
        },
      ],
      loader: {
        type: "json",
        url: "/api/v4/questions/{{ scope.params.questionId | url_path }}/answers",
        items: "data",
        metadata: {
          title: {
            select: "data[0].question.title",
            template: "{{ scope.value }} | {{ source.vars.sortLabels[scope.params.sort] }}",
          },
          home: {
            template: "/question/{{ scope.params.questionId | url_path }}?sort_by={{ scope.params.sort | url_query }}",
          },
          type: {
            template: "{{ source.vars.sortTypes[scope.params.sort] }}",
          },
        },
        fields: {
          title: {
            select: "excerpt || question.title",
            transform: [
              "strip_html",
              "normalize_whitespace",
              {
                op: "truncate",
                length: 160,
                suffix: "…",
              },
            ],
          },
          url: {
            select: "id",
            template: "/question/{{ scope.item.question.id }}/answer/{{ scope.value }}",
          },
          publishedAt: {
            select: "created_time",
            transform: "seconds_to_ms",
          },
          author: {
            name: "author.name",
          },
          stats: {
            score: "voteup_count || reaction.statistics.like_count",
            comments: "comment_count",
          },
          icon: {
            src: "author.avatar_url",
            kind: {
              template: "author",
            },
            label: "author.name",
          },
          content: {
            text: "excerpt",
          },
        },
        annotation: "{{ scope.item.author.name }}",
        query: {
          limit: "20",
          sort_by: "{{ scope.params.sort }}",
          include: "data[*].excerpt,voteup_count,comment_count",
        },
      },
    },
    "ring": {
      version: 2,
      metadata: {
        title: "圈子动态",
        type: "list",
      },
      params: {
        ringId: {
          type: "text",
          title: "圈子 ID",
          default: "1913608407048511547",
          required: true,
          validate: {
            format: "digits",
          },
        },
        sort: {
          type: "select",
          title: "排序",
          values: [
            {
              label: "最新",
              value: "new",
            },
            {
              label: "最热",
              value: "hot",
            },
          ],
          default: "new",
        },
      },
      radar: [
        {
          id: "zhihu-ring-sort",
          match: {
            hosts: [
              "zhihu.com",
            ],
            paths: [
              "/ring/host/:ringId",
            ],
            query: [
              "tab",
            ],
          },
          patch: {
            params: {
              ringId: "{{ scope.path.ringId }}",
              sort: "{{ scope.query.tab }}",
            },
            metadata: {
              title: {
                select: "title",
                transform: [
                  {
                    op: "regex_replace",
                    pattern: "^\\([^)]*封私信\\)\\s*",
                    replacement: "",
                  },
                  {
                    op: "regex_replace",
                    pattern: "\\s*-\\s*知乎$",
                    replacement: "",
                  },
                ],
                template: "{{ scope.value }} | {{ source.vars.ringSortLabels[scope.params.sort] }}",
              },
              home: "/ring/host/{{ scope.params.ringId | url_path }}?tab={{ scope.params.sort | url_query }}&tab_id=0",
            },
          },
        },
        {
          id: "zhihu-ring",
          match: {
            hosts: [
              "zhihu.com",
            ],
            paths: [
              "/ring/host/:ringId",
            ],
          },
          patch: {
            params: {
              ringId: "{{ scope.path.ringId }}",
            },
            metadata: {
              title: {
                select: "title",
                transform: [
                  {
                    op: "regex_replace",
                    pattern: "^\\([^)]*封私信\\)\\s*",
                    replacement: "",
                  },
                  {
                    op: "regex_replace",
                    pattern: "\\s*-\\s*知乎$",
                    replacement: "",
                  },
                ],
                template: "{{ scope.value }} | 最新",
              },
              home: "/ring/host/{{ scope.params.ringId | url_path }}?tab=new&tab_id=0",
            },
          },
        },
      ],
      loader: {
        type: "json",
        url: "/api/v4/rings/v1/{{ scope.params.ringId | url_path }}/feeds/{{ scope.params.sort | url_path }}/pc",
        items: "data[?ring_biz_data.is_topping != `true`]",
        metadata: {
          home: {
            template: "/ring/host/{{ scope.params.ringId | url_path }}?tab={{ scope.params.sort | url_query }}&tab_id=0",
          },
        },
        fields: {
          title: {
            select: "excerpt_title",
            transform: [
              "strip_html",
              "normalize_whitespace",
              {
                op: "truncate",
                length: 160,
                suffix: "…",
              },
            ],
          },
          url: {
            select: "id",
            template: "/pin/{{ scope.value }}",
          },
          publishedAt: {
            select: "created",
            transform: "seconds_to_ms",
          },
          author: {
            name: "author.name",
          },
          stats: {
            score: "reaction.statistics.applaud_count || like_count",
            comments: "reaction.statistics.comment_count || comment_count",
            stars: "reaction.statistics.favorites || favorite_count || favlists_count",
            likes: "reaction.statistics.like_count",
          },
          icon: {
            src: "author.avatar_url",
            kind: {
              template: "author",
            },
            label: "author.name",
          },
          content: {
            text: {
              select: "excerpt_title",
              transform: [
                "strip_html",
                "normalize_whitespace",
                {
                  op: "truncate",
                  length: 500,
                  suffix: "…",
                },
              ],
            },
            pictures: "content[?type == 'image'].url",
          },
        },
        annotation: "{{ scope.item.author.name }}",
        query: {
          limit: "10",
          offset: "0",
        },
      },
    },
    "hot-list": {
      version: 3,
      metadata: {
        title: "热榜",
        type: "ranking",
      },
      loader: {
        type: "json",
        url: "/api/v3/feed/topstory/hot-list-web",
        items: "data",
        fields: {
          title: "target.title_area.text",
          url: "target.link.url",
          mark: {
            src: "card_label.night_icon",
            kind: {
              template: "trend",
            },
            label: "card_label.text",
          },
          content: {
            text: "target.excerpt_area.text",
            pictures: "target.image_area.url",
          },
        },
        query: {
          limit: "50",
          desktop: "true",
        },
      },
    },
  },
} satisfies ProviderConfig
