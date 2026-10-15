import type { SourceDescriptor } from "@newsnext/sdk/models"
import type { NewsItem, SemanticPicture } from "@newsnext/shared/types"

export type { NewsItem, SemanticPicture, SourceDescriptor }

/**
 * Frontend source shape used by draggable LiveCards and Boards.
 * `id` is the LiveCard identifier carried by the LiveCard projection.
 */
export type LiveCardViewModel = Omit<SourceDescriptor, "id"> & {
  id: string
  sourceId: string
  boardId: string | null
  createdAt?: number
  metadataValue?: SourceDescriptor["metadata"]
  paramsValue?: Record<string, unknown>
}
