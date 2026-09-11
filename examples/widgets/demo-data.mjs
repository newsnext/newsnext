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
