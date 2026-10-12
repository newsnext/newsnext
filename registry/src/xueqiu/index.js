import { feedSources } from "./feeds.js"
import { marketSources } from "./market.js"
import { rankingSources } from "./rankings.js"
import { XUEQIU_ORIGIN } from "./shared.js"
import { stockSources } from "./stocks.js"
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
