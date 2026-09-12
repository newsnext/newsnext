// Activity digest: turns one retained-history query into the dashboard data the
// custom view renders. The producer stays self-contained so the Widget keeps
// working after it is copied out of this repository; when the SDK resolves from
// the Widget directory, `@newsnext/sdk/analytics` offers the same helpers.

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_TOPICS = 6
/** Mirrors the `recent` query limit in widget.json. */
const QUERY_LIMIT = 500

export default function load({ params = {}, queries = {} } = {}) {
  const days = integer(params.days, 3, 60, 14)
  const highlightCount = integer(params.highlights, 1, 10, 5)
  const topics = topicList(params.topics)
  const entries = readEntries(queries.recent)

  const dated = entries.filter(entry => entry.publishedAt !== undefined)
  const anchor = dated.length ? Math.max(...dated.map(entry => entry.publishedAt)) : Date.now()
  const end = Math.floor(anchor / DAY_MS) * DAY_MS + DAY_MS
  const start = end - days * DAY_MS
  const current = dated.filter(entry => entry.publishedAt >= start && entry.publishedAt < end)
  const previous = dated.filter(entry => entry.publishedAt >= start - days * DAY_MS && entry.publishedAt < start)

  const daily = Array.from({ length: days }, (_, index) => ({
    label: dayLabel(start + index * DAY_MS),
    value: 0,
  }))
  const buckets = new Map(daily.map((bucket, index) => [bucket.label, index]))
  for (const entry of current) count(daily, buckets, entry.publishedAt)

  // Group by LiveCard so two cards never merge into one bar just because they
  // share a source id or a missing display title.
  const cards = new Map()
  for (const entry of current) {
    const group = cards.get(entry.cardId) ?? { cardId: entry.cardId, host: entry.host, label: entry.label, value: 0 }
    group.value += 1
    cards.set(entry.cardId, group)
  }
  const groups = disambiguate([...cards.values()].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label)))
  const labels = new Map(groups.map(group => [group.cardId, group.label]))
  const ranked = groups.slice(0, 4)

  return {
    digest: {
      window: { days, start, end },
      totals: {
        items: current.length,
        previous: previous.length,
        change: percentChange(current.length, previous.length),
        sources: cards.size,
        undated: entries.length - dated.length,
        capped: entries.length >= QUERY_LIMIT,
      },
      busiest: busiestDay(daily),
      freshest: current.length ? Math.max(...current.map(entry => entry.publishedAt)) : null,
      daily,
      sources: ranked.map(group => ({ label: group.label, value: group.value, share: share(group.value, current.length) })),
      topics: topics.map(topic => summarize(topic, current, previous, daily, buckets)),
      highlights: [...current]
        .sort((a, b) => b.publishedAt - a.publishedAt)
        .slice(0, highlightCount)
        .map(entry => ({ label: entry.title, url: entry.url, source: labels.get(entry.cardId) ?? entry.label, publishedAt: entry.publishedAt })),
    },
  }
}

/** Latest results carry `{ value, cardId, sourceId, metadata }` envelopes. */
function readEntries(result) {
  if (result === undefined || result === null) return []
  if (!Array.isArray(result.items)) throw new Error("The recent query must contain an items array")
  return result.items.map((envelope, index) => {
    const value = envelope && typeof envelope === "object" && "value" in envelope ? envelope.value : envelope
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Item ${index + 1} is not an object`)
    if (typeof value.title !== "string" || !value.title.trim()) throw new Error(`Item ${index + 1} has no title`)
    if (typeof value.url !== "string" || !value.url.trim()) throw new Error(`Item ${index + 1} has no URL`)
    const publishedAt = value.publishedAt
    if (publishedAt !== undefined && publishedAt !== null && !Number.isFinite(publishedAt)) {
      throw new Error(`Item ${index + 1} has an invalid publication time`)
    }
    return {
      cardId: typeof envelope?.cardId === "string" ? envelope.cardId : "",
      host: hostOf(value.url),
      label: sourceLabel(envelope),
      publishedAt: Number.isFinite(publishedAt) ? publishedAt : undefined,
      title: value.title.trim(),
      url: value.url,
    }
  })
}

/** Two unnamed cards from the same source still need distinct bars. */
function disambiguate(rows) {
  const counts = new Map()
  for (const row of rows) counts.set(row.label, (counts.get(row.label) ?? 0) + 1)
  const used = new Map()
  return rows.map((row) => {
    const base = counts.get(row.label) > 1 && row.host ? `${row.label} · ${row.host}` : row.label
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    return { ...row, label: seen ? `${base} (${seen + 1})` : base }
  })
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function sourceLabel(envelope) {
  const metadata = envelope && typeof envelope === "object" ? envelope.metadata : undefined
  const title = metadata && typeof metadata === "object" && typeof metadata.title === "string" ? metadata.title.trim() : ""
  if (title) return title
  const sourceId = envelope && typeof envelope === "object" && typeof envelope.sourceId === "string" ? envelope.sourceId : ""
  const tail = (sourceId.split(":").pop() ?? "").replace(/[-_]+/g, " ").trim()
  return tail ? tail[0].toUpperCase() + tail.slice(1) : "Unknown source"
}

function summarize(topic, current, previous, daily, buckets) {
  const matches = entry => entry.title.toLowerCase().includes(topic.toLowerCase())
  const matched = current.filter(matches)
  const history = daily.map(bucket => ({ label: bucket.label, value: 0 }))
  for (const entry of matched) count(history, buckets, entry.publishedAt)
  const before = previous.filter(matches).length
  return {
    label: topic,
    value: matched.length,
    previous: before,
    change: percentChange(matched.length, before),
    history,
  }
}

function count(buckets, indexes, publishedAt) {
  const index = indexes.get(dayLabel(publishedAt))
  if (index !== undefined) buckets[index].value += 1
}

function busiestDay(daily) {
  const busiest = [...daily].sort((a, b) => b.value - a.value || b.label.localeCompare(a.label))[0]
  return busiest && busiest.value > 0 ? busiest : null
}

/** A zero baseline has no defined percentage change. */
function percentChange(current, previous) {
  if (!previous) return null
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10
}

function share(value, total) {
  return total ? Math.round((value / total) * 100) : 0
}

function dayLabel(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function topicList(value) {
  const topics = []
  const seen = new Set()
  for (const part of String(value ?? "").split(",")) {
    const topic = part.trim()
    if (!topic || seen.has(topic.toLowerCase())) continue
    seen.add(topic.toLowerCase())
    topics.push(topic)
    if (topics.length === MAX_TOPICS) break
  }
  return topics
}

function integer(value, min, max, fallback) {
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}
