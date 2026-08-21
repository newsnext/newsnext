import type { NewsItem, SemanticPicture } from "@newsnext/shared/types"
import type { SourceDescriptor } from "@newsnext/source-kit/types"

export type { NewsItem, SemanticPicture, SourceDescriptor }

/**
 * Frontend source shape used by draggable LiveCards and Boards.
 * `id` is the Instance identifier carried by the LiveCard projection.
 */
export type LiveCardViewModel = Omit<SourceDescriptor, "id"> & {
  id: string
  sourceId: string
  boardId: string | null
  createdAt?: number
  paramsValue?: Record<string, unknown>
}
