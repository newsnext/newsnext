import type { ReactNode } from "react"
import type { NewsItem } from "@/typings/source"
import { cn } from "@/lib/utils"
import { PhArrowFatUp, PhChatCircle, PhEye, PhHeart, PhRepeat, PhStar } from "../icons/ph"

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const exactNumberFormatter = new Intl.NumberFormat("en-US")

function Stat({ label, value, children, large }: {
  label: string
  value: number
  children: ReactNode
  large: boolean
}): ReactNode {
  const accessibleLabel = `${exactNumberFormatter.format(value)} ${label}`
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={accessibleLabel}
      aria-label={accessibleLabel}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center [&>svg]:size-full",
          large ? "size-5" : "size-3.5",
        )}
        aria-hidden
      >
        {children}
      </span>
      <span className="tabular-nums">
        {compactNumberFormatter.format(value)}
      </span>
    </span>
  )
}

export function NewsItemStats({ item, className, size = "default" }: {
  item: NewsItem
  className?: string
  size?: "default" | "large"
}): ReactNode {
  const { likes, comments, reposts, views, stars, score } = item.stats ?? {}
  const large = size === "large"
  if (likes === undefined && comments === undefined && reposts === undefined && views === undefined && stars === undefined && score === undefined) {
    return null
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-2 leading-none",
      large ? "h-5 text-sm leading-5" : "h-3.5 text-xs leading-3.5",
      className,
    )}
    >
      {likes !== undefined && <Stat large={large} label={likes === 1 ? "like" : "likes"} value={likes}><PhHeart /></Stat>}
      {comments !== undefined && <Stat large={large} label={comments === 1 ? "comment" : "comments"} value={comments}><PhChatCircle /></Stat>}
      {reposts !== undefined && <Stat large={large} label={reposts === 1 ? "repost" : "reposts"} value={reposts}><PhRepeat /></Stat>}
      {views !== undefined && <Stat large={large} label={views === 1 ? "view" : "views"} value={views}><PhEye /></Stat>}
      {stars !== undefined && <Stat large={large} label={stars === 1 ? "star" : "stars"} value={stars}><PhStar /></Stat>}
      {score !== undefined && <Stat large={large} label={score === 1 ? "point" : "points"} value={score}><PhArrowFatUp /></Stat>}
    </span>
  )
}
