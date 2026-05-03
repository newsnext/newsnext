import { $provider, $source } from "../utils/source"

interface ResItem {
  card_label?: {
    icon: string
    night_icon?: string
  }
  target: {
    title_area: {
      text: string
    }
    excerpt_area: {
      text: string
    }
    image_area: {
      url: string
    }
    metrics_area: {
      text: string
    }
    link: {
      url: string
    }
  }
}

export default $provider({
  name: "知乎",
  home: "https://www.zhihu.com",
  color: "blue",
  category: "china",
  sources: {
    default: $source.json(
      {
        title: "全站热榜",
        type: "hottest",
      },
      () => ({
        url: "https://www.zhihu.com/api/v3/feed/topstory/hot-list-web?limit=50&desktop=true",
        items: "data",
        fields: {
          title: "target.title_area.text",
          url: "target.link.url",
          meta: {
            mark: (item: ResItem) => item?.card_label?.night_icon
              && ({
                src: item.card_label.night_icon,
                radius: 0,
              }),
          },
          detail: {
            text: "target.excerpt_area.text",
            picture: "target.image_area.url",
          },
        },
      }),
    ),
  },
})
