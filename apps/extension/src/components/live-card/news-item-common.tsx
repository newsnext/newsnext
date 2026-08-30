import type { ReactNode } from "react"
import type { NewsItem, SemanticPicture } from "@/typings/source"
import { ProxiedImage } from "@newsnext/ui/components/proxied-image"
import { cn } from "@/lib/utils"
import { PhArrowFatUp, PhChatCircle, PhEye, PhHeart, PhRepeat, PhStar } from "../icons/ph"

interface NewsItemLinkProps {
  item: NewsItem
  className?: string
  children: ReactNode
}

export function NewsItemLink({ item, className, children }: NewsItemLinkProps): ReactNode {
  return (
    <a
      data-news-item
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className={cn("visited:text-neutral-500 dark:visited:text-neutral-400", className)}
    >
      {children}
    </a>
  )
}

function SemanticImage({ picture, className, scale, delay }: {
  picture: SemanticPicture
  className?: string
  scale?: number
  delay?: number
}) {
  const { src, label } = picture

  return (
    <ProxiedImage
      src={src}
      alt={label ?? ""}
      delay={delay}
      style={scale ? { transform: `scale(${scale})` } : undefined}
      className={cn("inline-block h-4 w-auto shrink-0 object-contain align-middle", className)}
    />
  )
}

const statNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})
const exactStatNumberFormatter = new Intl.NumberFormat("en-US")

function Stat({ label, value, children }: {
  label: string
  value: number
  children: ReactNode
}) {
  const accessibleLabel = `${exactStatNumberFormatter.format(value)} ${label}`
  return (
    <span
      className="inline-flex items-center gap-0.5"
      title={accessibleLabel}
      aria-label={accessibleLabel}
    >
      <span className="size-3.5" aria-hidden>{children}</span>
      <span className="tabular-nums">{statNumberFormatter.format(value)}</span>
    </span>
  )
}

function NewsItemStats({ item }: { item: NewsItem }) {
  const { likes, comments, reposts, views, stars, score } = item.stats ?? {}
  if (likes === undefined && comments === undefined && reposts === undefined && views === undefined && stars === undefined && score === undefined) {
    return null
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs leading-none text-neutral-400/80">
      {likes !== undefined && <Stat label={likes === 1 ? "like" : "likes"} value={likes}><PhHeart /></Stat>}
      {comments !== undefined && <Stat label={comments === 1 ? "comment" : "comments"} value={comments}><PhChatCircle /></Stat>}
      {reposts !== undefined && <Stat label={reposts === 1 ? "repost" : "reposts"} value={reposts}><PhRepeat /></Stat>}
      {views !== undefined && <Stat label={views === 1 ? "view" : "views"} value={views}><PhEye /></Stat>}
      {stars !== undefined && <Stat label={stars === 1 ? "star" : "stars"} value={stars}><PhStar /></Stat>}
      {score !== undefined && <Stat label={score === 1 ? "point" : "points"} value={score}><PhArrowFatUp /></Stat>}
    </span>
  )
}

function getDefaultInlineText(item: NewsItem): string {
  const values: string[] = []
  if (item.author && item.icon?.kind !== "author") values.push(item.author.name)
  if (item.attributes) values.push(...Object.values(item.attributes).map(String))
  return values.join(" · ")
}

interface NewsItemSummaryProps {
  item: NewsItem
  inlineText?: string
  className?: string
  inlineSuffix?: ReactNode
  markScale?: number
}

export function NewsItemSummary({ item, inlineText: renderedInlineText, className, inlineSuffix, markScale }: NewsItemSummaryProps) {
  const inlineText = renderedInlineText || getDefaultInlineText(item)
  return (
    <span className={cn("leading-none line-clamp-3", className)}>
      {item.icon && (
        <SemanticImage
          picture={item.icon}
          delay={500}
          className="mr-1 rounded"
        />
      )}
      <span className="mr-1 text-base align-middle">
        {item.title}
      </span>
      {(item.mark || inlineText || inlineSuffix || item.stats) && (
        <span className="inline-flex max-w-full items-center gap-1 align-middle leading-none">
          {item.mark && (
            <SemanticImage
              picture={item.mark}
              scale={markScale}
            />
          )}
          {(inlineText || inlineSuffix) && (
            <span className="self-end inline-flex min-w-0 max-w-80 items-center truncate text-xs leading-none text-neutral-400/80">
              {inlineText}
              {inlineText && inlineSuffix && <span className="mx-1">·</span>}
              {inlineSuffix}
            </span>
          )}
          <NewsItemStats item={item} />
        </span>
      )}
    </span>
  )
}
