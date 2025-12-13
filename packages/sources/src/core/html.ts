import { defineRSSSourceGetter, defineSource, defineSourceGetterWithParams } from "../utils/source"

export default defineSource({
  name: "HTML Parser",
  color: "blue",
  home: "https://html.com/",
  id: "default",
  ...defineSourceGetterWithParams({
    url: {
      type: "text",
      default: "https://bbs.pcbeta.com/forum.php?mod=rss&fid=563&page=1",
      title: "RSS URL",
    },
  }, async ({ url }) => {
    return await defineRSSSourceGetter(url)()
  }),
})
