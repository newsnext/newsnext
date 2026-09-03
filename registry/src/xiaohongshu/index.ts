import type { ProviderConfig } from "@newsnext/source-kit/registry"
import type { SourceLoaderContext, SourceLoaderOutput } from "@newsnext/source-kit/types"
import type { XiaohongshuFeedItem } from "./shared"
import { searchSource } from "./search"
import {
  parseXiaohongshuInitialState,
  sortXiaohongshuItemsByNewest,
  xiaohongshuFeedItemToNewsItem,
} from "./shared"

const XIAOHONGSHU_ORIGIN = "https://www.xiaohongshu.com"
const RESULT_LIMIT = 50

interface UserState {
  user?: {
    notes?: Array<Array<{
      id?: string
      noteCard?: XiaohongshuFeedItem["noteCard"]
      xsecToken?: string
    }>>
    userPageData?: {
      basicInfo?: {
        desc?: string
        imageb?: string
        images?: string
        nickname?: string
      }
    }
  }
}

async function fetchUserNotes(
  { userId }: { userId: string },
  context: SourceLoaderContext,
): Promise<SourceLoaderOutput> {
  const home = `${XIAOHONGSHU_ORIGIN}/user/profile/${encodeURIComponent(userId)}`
  const html = await context.fetch.get(home).text()
  const state = parseXiaohongshuInitialState(html) as UserState
  const user = state.user
  const basicInfo = user?.userPageData?.basicInfo
  const items = (user?.notes?.[0] ?? [])
    .map(item => xiaohongshuFeedItemToNewsItem({ ...item, modelType: "note" }, "pc_user"))
    .filter(item => item !== null)
  sortXiaohongshuItemsByNewest(items)
  return {
    items: items.slice(0, RESULT_LIMIT),
    metadata: {
      title: basicInfo?.nickname ? `${basicInfo.nickname} | 笔记` : "用户笔记",
      badge: basicInfo?.imageb ?? basicInfo?.images,
      desc: basicInfo?.desc,
      home,
    },
  }
}

export default {
  title: "小红书",
  category: "social",
  color: "red",
  icon: "https://fe-video-qc.xhscdn.com/fe-platform/ed8fe781ce9e16c1bfac2cd962f0721edabe2e49.ico",
  defaults: {
    baseUrl: `${XIAOHONGSHU_ORIGIN}/`,
    capabilities: {
      network: ["www.xiaohongshu.com"],
    },
  },
  sources: {
    search: searchSource,
    user: {
      version: 2,
      metadata: {
        title: "用户笔记",
        desc: "指定小红书用户发布的笔记",
      },
      params: {
        userId: {
          type: "text",
          title: "用户 ID",
          default: "6808bce2000000000e02e488",
          required: true,
          validate: { regex: "^[0-9a-f]{24}$" },
        },
      },
      radar: [{
        id: "xiaohongshu-user",
        match: {
          hosts: ["www.xiaohongshu.com"],
          paths: ["/user/profile/:userId"],
        },
        patch: {
          params: { userId: "{{ scope.path.userId }}" },
          metadata: {
            title: {
              select: ".user-name",
              template: "{{ scope.value }} | 笔记",
            },
            badge: {
              select: "img.user-image",
              attr: "src",
            },
            desc: { select: ".user-desc" },
            home: `${XIAOHONGSHU_ORIGIN}/user/profile/{{ scope.params.userId | url_path }}`,
          },
        },
      }],
      loader: { type: "custom", load: fetchUserNotes },
    },
  },
} satisfies ProviderConfig
