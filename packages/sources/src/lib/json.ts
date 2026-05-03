import { $jsonParam } from "../utils/params"
import { $provider, $source, resolvePath } from "../utils/source"

export default $provider({
  name: "JSON",
  color: "cyan",
  home: "https://www.json.org/",
  sources: {
    default: $source.json(
      {
        title: "V2EX",
        params: {
          url: {
            type: "url",
            default: "https://www.v2ex.com/feed/ideas.json",
            title: "Target URL",
          },
          headers: $jsonParam({
            default: "{}",
            title: "Request Headers (JSON)",
          }),
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
        },
      },
      ({ headers, url, itemsPath, titlePath, urlPath, timestampPath }) => {
        const fetchOptions = {
          headers,
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
      },
    ),
  },
})
