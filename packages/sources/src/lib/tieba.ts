import { $provider, $source } from "../utils/source"

interface TiebaTopic {
  topic_id: string
  topic_name: string
  create_time: number
  topic_url: string
}

interface TiebaResponse {
  data: {
    bang_topic: {
      topic_list: TiebaTopic[]
    }
  }
}

function resolveTopicUrl(url: string): string {
  return url.startsWith("http")
    ? url
    : `https://tieba.baidu.com${url}`
}

export default $provider({
  title: "百度贴吧",
  home: "https://tieba.baidu.com",
  color: "blue",
  category: "china",
  sources: {
    default: $source.json<TiebaTopic>(
      {
        title: "热议",
        type: "hottest",
      },
      () => ({
        url: "https://tieba.baidu.com/hottopic/browse/topicList",
        items: (json: TiebaResponse) => json.data.bang_topic.topic_list,
        fields: {
          title: "topic_name",
          url: item => resolveTopicUrl(item.topic_url),
          timestamp: item => item.create_time * 1000,
        },
      }),
    ),
  },
})
