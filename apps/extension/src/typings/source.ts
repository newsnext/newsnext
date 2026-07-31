import type { NewsItem } from "@newsnext/shared/types"
import type { SourceDescriptor } from "@newsnext/source/types"

export type { NewsItem, SourceDescriptor }

/**
 * Frontend source shape used by draggable cards and boards.
 * `id` is the unique card instance identifier used across the UI.
 */
export type BoardSource = Omit<SourceDescriptor, "id"> & {
  id: string
  sourceId: string
  boardId: string | null
  paramsValue?: Record<string, unknown>
}
