import { CommonSourceParams } from "../utils/params"
import { defineRSSSourceGetter, defineSource, defineSourceGetterWithParams } from "../utils/source"

export default defineSource({
  name: "RSS",
  color: "orange",
  home: "https://rss.com/",
  ...defineSourceGetterWithParams({
    url: {
      type: "url",
      default: "https://bbs.pcbeta.com/forum.php?mod=rss&fid=563&page=1",
      title: "RSS URL",
    },
    type: CommonSourceParams.type,
  }, async ({ url }) => {
    return await defineRSSSourceGetter(url)()
  }),
})
