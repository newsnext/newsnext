import { $feed, $provider, $rssFeedLoader } from "../utils/feed"
import { CommonFeedParams } from "../utils/params"

export default $provider({
  name: "RSS",
  color: "orange",
  home: "https://rss.com/",
  feeds: {
    default: $feed({
      ...$rssFeedLoader({
        url: {
          type: "url",
          default: "https://bbs.pcbeta.com/forum.php?mod=rss&fid=563&page=1",
          title: "RSS URL",
        },
        type: CommonFeedParams.type,
      }, ({ url }) => ({
        url,
      })),
    }),
  },
})
