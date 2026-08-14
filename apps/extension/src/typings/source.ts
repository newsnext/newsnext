import type { NewsItem, SemanticPicture } from "@newsnext/shared/types"
import type { SourceDescriptor } from "@newsnext/source/types"

export type { NewsItem, SemanticPicture, SourceDescriptor }

/**
 * Frontend source shape used by draggable cards and boards.
 * `id` is the unique card instance identifier used across the UI.
 */
export type CardViewModel = Omit<SourceDescriptor, "id"> & {
  id: string
  sourceId: string
  collectionId: string | null
  createdAt?: number
  paramsValue?: Record<string, unknown>
}
