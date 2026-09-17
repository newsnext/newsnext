// Board word cloud: segments titles collected by the Board this Widget is
// placed on into weighted keywords. The `recent` query is scoped by the
// placement, so installing this Widget on another Board follows that Board's
// complete LiveCard list without any code change.

const STOPWORDS = new Set(`a an the and or but of to in on at for from with by is are was were be been being it its this that these those as not no yes can could will would should may might have has had do does did how what why when where who which your you we our they their them he she his her there here very really much many about into more most new just than then now out up all some any get got also use using via says said rt vt so my me vs re 的 了 和 是 在 与 及 或 被 把 对 将 从 到 为 以 也 都 就 而 又 很 更 最 还 已 让 给 等 中 上 下 后 前 个 有 没有 这个 那个 一个 一种 一些 什么 怎么 如何 为什么 可以 可能 需要 进行 通过 以及 因为 所以 如果 但是 不是 还是 已经 目前 现在 今天 今日 最新 发布 表示 认为 相关 自己 我们 你们 他们 你 我 他 她 它 吗 呢 啊 吧 来 去 做 说 看 用 能 会 要 真的 直接 大家 使用 小时 聊聊 一下 感觉 方式 比较 知道 还有 一起 喜欢 完成 就是 很多 情况 时候 是不是 做了 进行 分享 拥有 支持 提供 发布 更新 带来 推出 上线`.split(/\s+/u))

const WINDOW_OPTIONS = new Set(["1", "24", "168", "720"])

function integer(value, min, max, fallback) {
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(Math.max(Math.floor(number), min), max)
}

// Retained values keep their original publishedAt shape: milliseconds,
// seconds, or an RFC 3339 string. Mirrors the daemon's publication_time.
function publishedMillis(value) {
  const raw = value?.publishedAt
  const number = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN
  if (Number.isFinite(number)) return number < 10_000_000_000 ? number * 1000 : number
  if (typeof raw === "string") {
    const parsed = Date.parse(raw)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export default function load({ params = {}, queries = {} } = {}) {
  const windowHours = WINDOW_OPTIONS.has(String(params.window)) ? Number(params.window) : 24
  const maxWords = integer(params.maxWords, 10, 200, 60)
  const now = Date.now()
  const start = now - windowHours * 3600 * 1000
  const envelopes = queries.recent?.items ?? []

  const segmenter = new Intl.Segmenter("zh", { granularity: "word" })
  const seen = new Set()
  const counts = new Map()
  for (const envelope of envelopes) {
    const value = envelope?.value
    if (!value || typeof value.title !== "string") continue
    const publishedAt = publishedMillis(value)
    if (publishedAt === null || publishedAt < start || publishedAt > now) continue
    const title = value.title.normalize("NFKC").trim()
    const identity = typeof value.url === "string" && value.url ? value.url : title.toLowerCase()
    if (!title || seen.has(identity)) continue
    seen.add(identity)
    const words = new Set()
    for (const part of segmenter.segment(title.replace(/https?:\/\/\S+/gu, " "))) {
      const word = part.segment.toLowerCase()
      if (!part.isWordLike || [...word].length < 2 || STOPWORDS.has(word) || !/\p{L}/u.test(word)) continue
      words.add(word)
    }
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1)
  }

  const rows = [...counts]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "en"))
    .slice(0, maxWords)
  return { cloud: { rows } }
}
