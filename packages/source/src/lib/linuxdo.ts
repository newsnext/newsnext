import type { ProviderConfig } from "@newsnext/source/utils/source"

const LINUX_DO_TOPICS = "topic_list.topics[?visible && !archived && !pinned]"
const LINUX_DO_AVATAR = "{% assign user = json.users | where: 'username', item.last_poster_username | first %}{% if user and user.avatar_template %}{{ user.avatar_template | replace: '{size}', '48' | absolute_url: 'https://linux.do' }}{% endif %}"

export default {
  title: "Linux.do",
  color: "slate",
  home: "https://linux.do",
  category: "tech",
  sources: {
    "latest": {
      title: "Latest",
      type: "timeline",
      loader: {
        type: "json",
        url: "https://linux.do/latest.json?order=created",
        items: LINUX_DO_TOPICS,
        fields: {
          title: "title",
          timestamp: {
            select: "created_at",
            template: "{{ value | date_to_ms }}",
          },
          url: {
            select: "id",
            template: "https://linux.do/t/topic/{{ value | url_path }}",
          },
          inline: {
            icon: {
              template: LINUX_DO_AVATAR,
            },
          },
        },
      },
      cache: "5m",
    },
    "top-daily": {
      title: "Hot",
      type: "hottest",
      loader: {
        type: "json",
        url: "https://linux.do/top/daily.json",
        items: LINUX_DO_TOPICS,
        fields: {
          title: "title",
          url: {
            select: "id",
            template: "https://linux.do/t/topic/{{ value | url_path }}",
          },
          inline: {
            icon: {
              template: LINUX_DO_AVATAR,
            },
          },
        },
      },
      cache: "5m",
    },
  },
} satisfies ProviderConfig
