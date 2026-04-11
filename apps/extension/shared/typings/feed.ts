import type { FeedDescriptor } from "@newsnext/feeds/typings"
import type { FeedType, NewsItem } from "@newsnext/shared/types"

export type { FeedDescriptor, FeedType, NewsItem }

/**
 * Frontend feed shape used by draggable cards and boards.
 * `id` is the unique card instance identifier used across the UI.
 */
export type BoardFeed = Omit<FeedDescriptor, "id"> & {
  id: string
  feedId: string
  variantId: string
  isCopy: boolean
}
