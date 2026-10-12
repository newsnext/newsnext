import { feedSources } from "./feeds"
import { marketSources } from "./market"
import { rankingSources } from "./rankings"
import { XUEQIU_ORIGIN } from "./shared"
import { stockSources } from "./stocks"
/** @type {import("@newsnext/source-kit/registry").ProviderConfig} */
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
}
