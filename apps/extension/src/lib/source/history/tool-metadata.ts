export const SOURCE_HISTORY_TOOL_LABELS = {
  compare_source_history_observations: "Compare source observations",
  get_source_history_observation: "Read source observation",
  list_source_history_datasets: "List source histories",
  list_source_history_observations: "List source observations",
} as const satisfies Readonly<Record<string, string>>

export function getSourceHistoryToolLabel(name: string): string | undefined {
  if (!(name in SOURCE_HISTORY_TOOL_LABELS)) return
  return SOURCE_HISTORY_TOOL_LABELS[name as keyof typeof SOURCE_HISTORY_TOOL_LABELS]
}
