import { myFetch } from "../utils/fetch"
import { $provider, $source } from "../utils/source"

interface LinuxDoTopicListResponse {
  topic_list: {
    can_create_topic: boolean
    more_topics_url: string
    per_page: number
    top_tags: string[]
    topics: LinuxDoTopic[]
  }
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

async function fetchTopics(url: string): Promise<LinuxDoTopic[]> {
  const res = await myFetch<LinuxDoTopicListResponse>(url)

  return res.topic_list.topics.filter(topic =>
    topic.visible && !topic.archived && !topic.pinned,
  )
}

const latestLoader = async () => {
  const topics = await fetchTopics("https://linux.do/latest.json?order=created")

  return topics.map(topic => ({
    title: topic.title,
    timestamp: new Date(topic.created_at).valueOf(),
    url: `https://linux.do/t/topic/${topic.id}`,
  }))
}

const hotLoader = async () => {
  const topics = await fetchTopics("https://linux.do/top/daily.json")

  return topics.map(topic => ({
    title: topic.title,
    url: `https://linux.do/t/topic/${topic.id}`,
  }))
}

export default $provider({
  title: "Linux.do",
  color: "slate",
  home: "https://linux.do",
  category: "tech",
  sources: [
    $source(
      {
        key: "latest",
        title: "Latest",
        type: "timeline",
      },
      latestLoader,
    ),
    $source(
      {
        key: "hot",
        title: "Hot",
        type: "hottest",
      },
      hotLoader,
    ),
  ],
})
