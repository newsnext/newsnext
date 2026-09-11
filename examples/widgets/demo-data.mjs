// Deterministic demo observations. Views never fetch or transform these inputs.
export const categories = [
  { label: "Technology", value: 84 },
  { label: "Science", value: 62 },
  { label: "Design", value: 48 },
  { label: "Business", value: 35 },
  { label: "Culture", value: 27 },
  { label: "Climate", value: 19 },
]
export const datasets = {
  categories,
  metrics: [{ label: "Articles", value: 1248 }, { label: "Sources", value: 36 }, { label: "Topics", value: 84 }, { label: "New today", value: 127 }],
  trend: Array.from({ length: 14 }, (_, i) => ({ label: `Sep ${i + 1}`, value: 30 + (i * 17 % 31) + i * 3 })),
  series: Array.from({ length: 7 }, (_, i) => ["Research", "Products", "Industry"].map((series, j) => ({ label: `Sep ${i + 1}`, series, value: 12 + ((i + 1) * (j + 3) * 7 % 30) }))).flat(),
  scatter: Array.from({ length: 32 }, (_, i) => ({ label: `Article ${i + 1}`, value: i + 1, x: 10 + i * 3, y: 15 + i * 2 + (i * 13 % 29) })),
  heatmap: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].flatMap((x, i) => ["Morning", "Afternoon", "Evening"].map((y, j) => ({ label: `${x} ${y}`, x, y, value: 5 + ((i + 1) * (j + 3) * 11 % 60) }))),
  distribution: Array.from({ length: 100 }, (_, i) => ({ label: `Sample ${i + 1}`, value: 20 + (i * 17 % 40) + (i * 7 % 23) })),
  funnel: [{ label: "Discovered", value: 1200 }, { label: "Relevant", value: 850 }, { label: "Read", value: 460 }, { label: "Saved", value: 180 }],
  words: ["AI", "Research", "Open source", "Design", "Science", "Climate", "Robotics", "Space", "Data", "Security", "Energy", "Web", "Culture", "Learning", "Health", "Tools", "Ideas", "Markets"].map((label, i) => ({ label, value: 100 - i * 5 })),
}

export default function load({ params = {} } = {}) {
  const rows = datasets[params.dataset ?? "categories"]
  if (!rows) throw new Error("Unknown demo dataset")
  return { observations: { rows } }
}

Object.assign(datasets, {
  comparisons: categories.map((row, i) => ({ ...row, previous: row.value - 12 + i * 4, previousRank: [2, 1, 5, 3, 6, 4][i], history: Array.from({ length: 12 }, (_, j) => row.value - (11 - j) * 2 + (j === 11 ? 0 : j * 7 % 9)) })),
  calendar: Array.from({ length: 120 }, (_, i) => ({ label: new Date(Date.UTC(2026, 5, 1 + i)).toISOString().slice(0, 10), value: i * 17 % 40 })),
  statuses: ["ok", "warning", "error", "unknown"].map((status, i) => ({ label: ["News feed", "Research feed", "Social feed", "Archive"][i], status, detail: ["All sources up to date", "One source is delayed", "Connection failed", "Waiting for first refresh"][i], timestamp: `2026-09-11T10:${30 + i}:00Z` })),
  events: ["Source refreshed", "New topic discovered", "Board updated", "Daily digest ready"].map((label, i) => ({ label, detail: ["24 new articles collected", "Robotics is trending", "Three relevant items added", "Your reading list is available"][i], timestamp: `2026-09-11T${10 + i}:00:00Z` })),
  targets: categories.slice(0, 4).map((row, i) => ({ ...row, target: 65 + i * 5, range: [0, 100] })),
  boxes: categories.slice(0, 4).map((row, i) => ({ label: row.label, value: 35 + i * 8, box: [10 + i * 5, 25 + i * 6, 35 + i * 8, 50 + i * 7, 70 + i * 6], outliers: [85 + i * 5] })),
  contributions: [{ label: "Starting", value: 100 }, { label: "New", value: 45 }, { label: "Expired", value: -30 }, { label: "Restored", value: 15 }, { label: "Removed", value: -20 }],
  flows: [{ label: "Feeds", destination: "Relevant", value: 80 }, { label: "Search", destination: "Relevant", value: 45 }, { label: "Feeds", destination: "Filtered", value: 30 }, { label: "Relevant", destination: "Read", value: 90 }, { label: "Relevant", destination: "Saved", value: 35 }],
})

export const presetDatasets = {
  "metric": "metrics",
  "line": "trend",
  "area": "trend",
  "bar": "categories",
  "ranking": "categories",
  "stacked-bar": "series",
  "donut": "categories",
  "scatter": "scatter",
  "heatmap": "heatmap",
  "histogram": "distribution",
  "radar": "categories",
  "funnel": "funnel",
  "table": "categories",
  "word-cloud": "words",
  "progress": "categories",
  "trend-metric": "comparisons",
  "change-ranking": "comparisons",
  "calendar": "calendar",
  "status": "statuses",
  "timeline": "events",
  "treemap": "categories",
  "bullet": "targets",
  "boxplot": "boxes",
  "waterfall": "contributions",
  "sankey": "flows",
}
