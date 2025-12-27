import { defineJsonSourceFetcher, defineSource, resolvePath } from "../utils/source"

export default defineSource({
  name: "JSON",
  color: "cyan",
  home: "https://www.json.org/",
  ...defineJsonSourceFetcher({
    url: {
      type: "url",
      default: "https://www.v2ex.com/feed/ideas.json",
      title: "Target URL",
    },
    headers: {
      type: "text",
      default: "{}",
      title: "Request Headers (JSON)",
    },
    itemsPath: {
      type: "text",
      default: "items",
      title: "Items Path",
    },
    titlePath: {
      type: "text",
      default: "title",
      title: "Title Path",
    },
    urlPath: {
      type: "text",
      default: "url",
      title: "URL Path",
    },
    timestampPath: {
      type: "text",
      default: "date_published",
      title: "Timestamp Path",
    },
  }, ({ headers, url, itemsPath, titlePath, urlPath, timestampPath }) => {
    const fetchOptions = {
      headers: JSON.parse(headers),
    }
    return {
      url,
      fetchOptions,
      items: itemsPath,
      fields: {
        title: item => resolvePath(item, titlePath),
        url: item => resolvePath(item, urlPath),
        timestamp: item => resolvePath(item, timestampPath),
      },
    }
  }),
})
