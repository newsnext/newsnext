import type { IframeHTMLAttributes } from "react"
import type { MaybeArray } from "./util"

export interface SemanticPicture {
  src: string
  /** Machine-readable role or distinction represented by the picture. */
  kind?: string
  /** Human-readable meaning of the picture. */
  label?: string
}

export interface NewsItemAuthor {
  name: string
  home?: string
}

export const NEWS_ITEM_STAT_KEYS = ["likes", "comments", "reposts", "views", "stars", "score"] as const

export type NewsItemStatKey = (typeof NEWS_ITEM_STAT_KEYS)[number]
export type NewsItemStats = Partial<Record<NewsItemStatKey, number>>

export type NewsItemAttributeValue = boolean | number | string

export interface AdvancedIframe extends IframeHTMLAttributes<HTMLIFrameElement> {
  selector?: string
  blocked?: MaybeArray<string>
  aspectRatio?: number
}

export interface NewsItemContent {
  text?: string
  html?: string
  pictures?: MaybeArray<string>
  iframe?: string | AdvancedIframe
}

export interface NewsItem {
  /** Title of the news item. */
  title: string
  /** URL of the news item, used as its unique identifier. */
  url: string
  /** Mobile-optimized URL. Defaults to `url`. */
  mobileUrl?: string
  /** Original publication time in milliseconds. */
  publishedAt?: number
  /** Last content update time in milliseconds. */
  updatedAt?: number
  author?: NewsItemAuthor
  stats?: NewsItemStats
  /** Source-specific facts that do not belong to the shared fields. */
  attributes?: Record<string, NewsItemAttributeValue>
  /** The regular identifying picture used by items from this source. */
  icon?: SemanticPicture
  /** A visual distinction present only on exceptional items. */
  mark?: SemanticPicture
  /** Content beyond the item title, independent of how the UI presents it. */
  content?: NewsItemContent
}

type OptionalValue<T> = T | null | undefined

export interface NewsItemInput {
  title: string
  url: string
  mobileUrl?: OptionalValue<string>
  publishedAt?: OptionalValue<number>
  updatedAt?: OptionalValue<number>
  author?: OptionalValue<{
    name?: OptionalValue<string>
    home?: OptionalValue<string>
  }>
  stats?: OptionalValue<{
    [K in keyof NewsItemStats]?: OptionalValue<NewsItemStats[K]>
  }>
  attributes?: OptionalValue<Record<string, NewsItemAttributeValue | null | undefined>>
  icon?: OptionalValue<Omit<Partial<SemanticPicture>, "src"> & { src?: OptionalValue<string> }>
  mark?: OptionalValue<Omit<Partial<SemanticPicture>, "src"> & { src?: OptionalValue<string> }>
  content?: OptionalValue<{
    text?: OptionalValue<string>
    html?: OptionalValue<string>
    pictures?: OptionalValue<NewsItemContent["pictures"]>
    iframe?: OptionalValue<NewsItemContent["iframe"]>
  }>
}
