import { defineHtmlSourceFetcher, defineSource } from "../utils/source"

export default defineSource({
  name: "HTML Parser",
  color: "blue",
  home: "https://html.com/",
  ...defineHtmlSourceFetcher({
    url: {
      type: "url",
      default: "https://bbs.pcbeta.com/viewthread-2059838-1-1.html",
      title: "Target URL",
    },
    decoding: {
      type: "text",
      default: "UTF-8",
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
  }, ({ url, decoding, itemSelector, titleSelector, linkSelector }) => ({
    url,
    decoding,
    itemSelector,
    fields: {
      title: titleSelector,
      url: linkSelector,
    },
  })),
})
