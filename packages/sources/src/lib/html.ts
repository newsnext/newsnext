import { defineHtmlSourceGetter } from "../utils/html-source"
import { defineSource } from "../utils/source"

export default defineSource({
  name: "HTML Parser",
  color: "blue",
  home: "https://html.com/",
  ...defineHtmlSourceGetter({
    params: {
      url: {
        type: "url",
        default: "https://bbs.pcbeta.com/viewthread-2059838-1-1.html",
        title: "Target URL",
      },
      decoding: {
        type: "text",
        default: "gbk",
        title: "Decoding",
      },
      itemSelector: {
        type: "text",
        default: "#postlist > div[id^='post_']",
        title: "Item Selector",
      },
      titleSelector: {
        type: "text",
        default: ".authi .xw1",
        title: "Title Selector",
      },
      linkSelector: {
        type: "text",
        default: "",
        title: "Link Selector",
      },
    },
    url: params => params.url,
    decoding: params => params.decoding,
    itemSelector: params => params.itemSelector,
    fields: {
      title: params => params.titleSelector,
      url: params => params.linkSelector,
    },
  }),
})
