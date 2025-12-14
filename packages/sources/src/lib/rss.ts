import { CommonSourceParams } from "../utils/params"
import { defineRSSSourceFetcher, defineSource } from "../utils/source"

export default defineSource({
  name: "RSS",
  color: "orange",
  home: "https://rss.com/",
  ...defineRSSSourceFetcher({
    url: {
      type: "url",
      default: "https://bbs.pcbeta.com/forum.php?mod=rss&fid=563&page=1",
      title: "RSS URL",
    },
    type: CommonSourceParams.type,
  }, ({ url }) => ({
    url,
  })),
})
