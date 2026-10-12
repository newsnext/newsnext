const HOT_SEARCH_ENDPOINTS = {
  search: "side/hotSearch",
  mine: "statuses/mineBand",
  entertainment: "statuses/entertainment",
  social: "statuses/social",
  tech: "statuses/technology",
  life: "statuses/life",
  sports: "statuses/sport",
  acg: "statuses/acg",
}
export function parseWeiboHotSearch(response) {
  const items = response.data?.realtime?.length ? response.data.realtime : response.data?.band_list ?? []
  return items.flatMap((item) => {
    if (item.is_ad === 1 || (item.rank == null && item.realpos == null))
      return []
    const title = item.note || item.word || item.name
    const keyword = item.word_scheme || item.word
    const url = item.url
      ? item.url.replace(/^http:\/\//, "https://")
      : keyword ? `https://s.weibo.com/weibo?q=${encodeURIComponent(keyword)}` : undefined
    if (!title || !url)
      return []
    const icon = item.icon || item.icon_url
    return [{
      title,
      url,
      mark: icon ? { src: icon, kind: "trend", label: item.word } : undefined,
    }]
  })
}
export async function fetchWeiboHotSearch({ type }, context) {
  const response = await context.fetch.get(`https://weibo.com/ajax/${HOT_SEARCH_ENDPOINTS[type]}`)
    .json()
  return { items: parseWeiboHotSearch(response) }
}
