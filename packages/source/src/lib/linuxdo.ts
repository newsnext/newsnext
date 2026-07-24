import { $provider, $source } from "@newsnext/source/utils/source"

interface LinuxDoTopicListResponse {
  topic_list: {
    can_create_topic: boolean
    more_topics_url: string
    per_page: number
    top_tags: string[]
    topics: LinuxDoTopic[]
  }
  users?: LinuxDoUser[]
}

interface LinuxDoUser {
  username: string
  avatar_template?: string
}

interface LinuxDoTopic {
  id: number
  title: string
  fancy_title: string
  posts_count: number
  reply_count: number
  highest_post_number: number
  image_url: null | string
  created_at: string
  last_posted_at: string
  bumped: boolean
  bumped_at: string
  unseen: boolean
  pinned: boolean
  excerpt?: string
  visible: boolean
  closed: boolean
  archived: boolean
  like_count: number
  has_summary: boolean
  last_poster_username: string
  category_id: number
  pinned_globally: boolean
}

interface LinuxDoTopicWithAvatar extends LinuxDoTopic {
  last_poster_avatar?: string
}

function normalizeLinuxDoAvatarUrl(avatarTemplate: string): string {
  const avatarUrl = avatarTemplate.replace("{size}", "48")
  if (avatarUrl.startsWith("//")) {
    return `https:${avatarUrl}`
  }

  if (avatarUrl.startsWith("/")) {
    return `https://linux.do${avatarUrl}`
  }

  return avatarUrl
}

function getTopicsWithAvatars(res: LinuxDoTopicListResponse): LinuxDoTopicWithAvatar[] {
  const avatars = new Map(
    (res.users ?? [])
      .flatMap(user => user.avatar_template ? [[user.username, normalizeLinuxDoAvatarUrl(user.avatar_template)]] : []),
  )

  return res.topic_list.topics.filter(topic =>
    topic.visible && !topic.archived && !topic.pinned,
  ).map(topic => ({
    ...topic,
    last_poster_avatar: avatars.get(topic.last_poster_username),
  }))
}

export default $provider({
  title: "Linux.do",
  color: "slate",
  home: "https://linux.do",
  category: "tech",
  sources: [
    $source({
      metadata: {
        key: "latest",
        title: "Latest",
        type: "timeline",
      },
      loader: {
        type: "json",
        url: "https://linux.do/latest.json?order=created",
        items: getTopicsWithAvatars,
        fields: {
          title: "title",
          timestamp: topic => new Date(topic.created_at).valueOf(),
          url: topic => `https://linux.do/t/topic/${topic.id}`,
          inline: {
            icon: topic => topic.last_poster_avatar ? { src: topic.last_poster_avatar, radius: 999 } : undefined,
          },
        },
      },
      cache: "5m",
    }),
    $source({
      metadata: {
        key: "top-daily",
        title: "Hot",
        type: "hottest",
      },
      loader: {
        type: "json",
        url: "https://linux.do/top/daily.json",
        items: getTopicsWithAvatars,
        fields: {
          title: "title",
          url: topic => `https://linux.do/t/topic/${topic.id}`,
          inline: {
            icon: topic => topic.last_poster_avatar ? { src: topic.last_poster_avatar, radius: 999 } : undefined,
          },
        },
      },
      cache: "5m",
    }),
  ],
})
