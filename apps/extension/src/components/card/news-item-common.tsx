import type { NewsItem } from "@/typings/source"
import { extractPictures } from "@newsnext/shared/types"
import { cn } from "@/lib/utils"
import { ProxiedImage } from "../preview/proxied-image"

interface NewsItemInlineProps {
  item: NewsItem
  className?: string
}

export function NewsItemInline({ item }: NewsItemInlineProps) {
  const hasMeta = item?.inline?.html || item?.inline?.text
  const hasMark = item?.inline?.mark

  if (!hasMeta && !hasMark) {
    return null
  }

  return (
    <span className="inline-flex max-w-full items-center gap-1 align-middle leading-none">
      {hasMark
        ? extractPictures(hasMark).map((mark, i) => {
            const { src, scale, radius } = mark
            return (
              <ProxiedImage
                key={`mark-${i}`}
                src={src}
                style={{
                  transform: `scale(${scale ?? 1})`,
                  borderRadius: `${radius ?? 4}px`,
                }}
                className="inline-block h-4 shrink-0 object-cover align-middle"
              />
            )
          })
          // for hight
        : <span className="inline-block h-4 -ml-1" />}
      <span className="self-end inline-flex min-w-0 max-w-80 items-center gap-1 truncate text-xs leading-none text-neutral-400/80">
        {item.inline?.html && <span dangerouslySetInnerHTML={{ __html: item.inline.html }} />}
        {item.inline?.text && <span>{item.inline.text}</span>}
      </span>
    </span>
  )
}

interface NewsItemSummaryProps {
  item: NewsItem
  className?: string
}

export function NewsItemSummary({ item, className }: NewsItemSummaryProps) {
  return (
    <span className={cn("leading-none line-clamp-3", className)}>
      {item.inline?.icon && extractPictures(item.inline.icon).map((icon, i) => {
        const { src, scale, radius } = icon
        return (
          <ProxiedImage
            key={`icon-${i}`}
            delay={500}
            src={src}
            style={{
              transform: `scale(${scale ?? 1})`,
              borderRadius: `${radius ?? 4}px`,
            }}
            className="mr-1 inline-block h-4 w-4 object-cover align-middle"
          />
        )
      })}
      <span className="mr-1 text-base align-middle">
        {item.title}
      </span>
      {item.inline && (
        <NewsItemInline item={item} />
      )}
    </span>
  )
}
