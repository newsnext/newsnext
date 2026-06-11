import { CommonSourceParams } from "../utils/params"
import { $provider, $source } from "../utils/source"

export default $provider({
  title: "RSS",
  color: "orange",
  home: "https://rss.com/",
  sources: {
    default: $source.rss(
      {
        title: "PCBeta",
        params: {
          url: {
            type: "url",
            default: "https://bbs.pcbeta.com/forum.php?mod=rss&fid=563&page=1",
            title: "RSS URL",
          },
          type: CommonSourceParams.type,
        },
      },
      ({ url }) => ({
        url,
      }),
    ),
  },
})
