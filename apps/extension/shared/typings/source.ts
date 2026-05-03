import type { SourceDescriptor } from "@newsnext/sources/typings"
import type { SourceType, NewsItem } from "@newsnext/shared/types"

export type { SourceDescriptor, SourceType, NewsItem }

/**
 * Frontend source shape used by draggable cards and boards.
 * `id` is the unique card instance identifier used across the UI.
 */
export type BoardSource = Omit<SourceDescriptor, "id"> & {
  id: string
  sourceId: string
  variantId: string
  paramsValue?: Record<string, unknown>
  isFork: boolean
}
