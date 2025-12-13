import { defineJsonSourceGetter, resolvePath } from "../utils/json-source"
import { defineSource } from "../utils/source"

export default defineSource({
  name: "JSON",
  color: "cyan",
  home: "https://www.json.org/",
  ...defineJsonSourceGetter({
    params: {
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
      updatedPath: {
        type: "text",
        default: "date_published",
        title: "Updated Path",
      },
    },
    url: params => params.url,
    fetchOptions: (params) => {
      try {
        const headers = JSON.parse(params.headers || "{}")
        return { headers }
      } catch {
        return {}
      }
    },
    items: (_, params) => params.itemsPath,
    fields: {
      title: (item, params) => resolvePath(item, params.titlePath),
      url: (item, params) => resolvePath(item, params.urlPath),
      updated: (item, params) => resolvePath(item, params.updatedPath),
    },
  }),
})
