export default function load({ params = {}, queries = {} } = {}) {
  const maxWords = Math.min(Math.max(Number(params.maxWords) || 60, 10), 200)
  const counts = new Map()
  for (const envelope of queries.recent?.items ?? []) {
    const title = envelope?.value?.title
    if (typeof title !== "string") continue
    for (const word of title.toLowerCase().split(/[^a-z]+/)) {
      if (word.length < 2) continue
      counts.set(word, (counts.get(word) ?? 0) + 1)
    }
  }
  const rows = [...counts]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, maxWords)
  return { cloud: { rows } }
}
