import type { SourceItemTemplate } from "@newsnext/source/types"
import type { ReactNode } from "react"
import type { NewsItem, SemanticPicture } from "@/typings/source"
import { compileSourceTemplate, createSourceTemplateScope, reportTemplateError } from "@newsnext/source/core"
import { ProxiedImage } from "@newsnext/ui/components/proxied-image"
import { cn } from "@/lib/utils"

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

function formatStat(value: number, singular: string, plural: string): string {
  const formatted = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
  return `${formatted} ${value === 1 ? singular : plural}`
}

function getDefaultInlineText(item: NewsItem): string {
  const values: string[] = []
  if (item.author && item.icon?.kind !== "author") values.push(item.author.name)
  if (item.attributes) values.push(...Object.values(item.attributes).map(String))
  if (item.stats) {
    const { likes, comments, reposts, views, score } = item.stats
    if (likes !== undefined) values.push(formatStat(likes, "like", "likes"))
    if (comments !== undefined) values.push(formatStat(comments, "comment", "comments"))
    if (reposts !== undefined) values.push(formatStat(reposts, "repost", "reposts"))
    if (views !== undefined) values.push(formatStat(views, "view", "views"))
    if (score !== undefined) values.push(formatStat(score, "point", "points"))
  }
  return values.join(" · ")
}

function renderInlineTemplate(item: NewsItem, itemTemplate: SourceItemTemplate | undefined): string {
  if (!itemTemplate) return getDefaultInlineText(item)
  try {
    return compileSourceTemplate(itemTemplate.inline, {
      location: "source result.itemTemplate.inline",
      slot: "item",
    }).render(createSourceTemplateScope(undefined, { item })).trim()
  } catch (error) {
    reportTemplateError(error)
    return getDefaultInlineText(item)
  }
}

interface NewsItemSummaryProps {
  item: NewsItem
  itemTemplate?: SourceItemTemplate
  className?: string
  markScale?: number
}

export function NewsItemSummary({ item, itemTemplate, className, markScale }: NewsItemSummaryProps) {
  const inlineText = renderInlineTemplate(item, itemTemplate)
  return (
    <span className={cn("leading-none line-clamp-3", className)}>
      {item.icon && (
        <SemanticImage
          picture={item.icon}
          delay={500}
          className="mr-1"
        />
      )}
      <span className="mr-1 text-base align-middle">
        {item.title}
      </span>
      {(item.mark || inlineText) && (
        <span className="inline-flex max-w-full items-center gap-1 align-middle leading-none">
          {item.mark && (
            <SemanticImage
              picture={item.mark}
              scale={markScale}
            />
          )}
          {inlineText && (
            <span className="self-end inline-flex min-w-0 max-w-80 items-center truncate text-xs leading-none text-neutral-400/80">
              {inlineText}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
