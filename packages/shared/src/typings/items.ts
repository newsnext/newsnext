import type { IframeHTMLAttributes } from "react"
import type { Either, MaybeArray } from "./util"

interface Picture {
  src: string
  scale?: number
  radius?: number
  /**
   * Href of the picture when clicked
   */
  href?: string
}

type RichText = Either<{
  text: string
}, {
  html: string
}>

export interface AdvancedIframe extends IframeHTMLAttributes<HTMLIFrameElement> {
  selector?: string
  blocked?: MaybeArray<string>
}

export interface NewsItem {
  /**
   * Title of the news item
   */
  title: string
  /**
   * URL of the news item (used as unique identifier)
   */
  url: string
  /**
   * Mobile-optimized URL
   * @default url
   */
  mobileUrl?: string
  /**
   * Timestamp in milliseconds
   */
  timestamp?: number
  inline?: RichText & {
    /**
     * Mark displayed in the end of the item
     */
    mark?: MaybeArray<string | Picture>
    /**
     * Icon displayed in the start of the item
     */
    icon?: string | Picture
  }
  /**
   * Previewed information shown on hover
   */
  preview?: RichText & {
    picture?: MaybeArray<string | Picture>
    iframe?: string | AdvancedIframe
  }
}

export const extractPictures = (pictures: MaybeArray<string | Picture>): Picture[] => {
  return (Array.isArray(pictures) ? pictures : [pictures]).map((p) => {
    if (typeof p === "string") {
      return { src: p }
    }
    return p
  })
}