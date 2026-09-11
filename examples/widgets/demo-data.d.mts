import type { WidgetChart } from "../../packages/sdk/src/models/widget-view.js"

export const categories: { label: string, value: number }[]
export const datasets: Record<string, Record<string, unknown>[]>
export const presetDatasets: Record<WidgetChart, string>
export default function load(context?: { params?: { dataset?: string } }): { observations: { rows: Record<string, unknown>[] } }
