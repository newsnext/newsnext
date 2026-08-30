import type { ProviderConfig } from "@newsnext/source-kit/registry"
import { feedSources } from "./feeds"
import { marketSources } from "./market"
import { rankingSources } from "./rankings"
import { XUEQIU_ORIGIN } from "./shared"
import { stockSources } from "./stocks"

export default {
  title: "雪球",
  category: "finance",
  color: "blue",
  defaults: {
    baseUrl: `${XUEQIU_ORIGIN}/`,
  },
  sources: {
    ...rankingSources,
    ...marketSources,
    ...feedSources,
    ...stockSources,
  },
} satisfies ProviderConfig
