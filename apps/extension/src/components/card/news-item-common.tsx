import type { NewsItem } from "@/typings/source"
import { extractPictures } from "@newsnext/shared/types"
import { cn } from "@/lib/utils"
import { ProxiedImage } from "../preview/proxied-image"

interface NewsItemInlineProps {
  item: NewsItem
  className?: string
}

export function NewsItemInline({ item, className }: NewsItemInlineProps) {
  const hasMeta = item?.inline?.html || item?.inline?.text
  const hasMark = item?.inline?.mark

  if (!hasMeta && !hasMark) {
    return null
  }

  return (
    <>
      {hasMark && extractPictures(hasMark).map((mark, i) => {
        const { src, scale, radius } = mark
        return (
          <ProxiedImage
            key={`mark-${i}`}
            src={src}
            style={{
              transform: `scale(${scale ?? 1})`,
              borderRadius: `${radius ?? 4}px`,
            }}
            className="h-4 inline -mt-1 mr-1"
          />
        )
      })}
      <span className={cn("text-xs text-neutral-400/80 space-x-1", className)}>
        {item.inline?.html && <span dangerouslySetInnerHTML={{ __html: item.inline.html }} />}
        {item.inline?.text && <span>{item.inline.text}</span>}
      </span>
    </>
  )
}

interface NewsItemSummaryProps {
  item: NewsItem
  className?: string
}

export function NewsItemSummary({ item, className }: NewsItemSummaryProps) {
  return (
    <span className={cn("leading-none space-x-1", className)}>
      {item.inline?.icon && extractPictures(item.inline.icon).map((icon, i) => {
        const { src, scale, radius, href } = icon
        return (
          <ProxiedImage
            key={`icon-${i}`}
            delay={500}
            src={src}
            href={href}
            style={{
              transform: `scale(${scale ?? 1})`,
              borderRadius: `${radius ?? 4}px`,
            }}
            className="h-4 w-4 object-contain inline -mt-1"
          />
        )
      })}
      <span className="text-base">
        {item.title}
      </span>
      {item.inline && (
        <NewsItemInline item={item} className="truncate align-middle max-w-80 inline-block -mt-1" />
      )}
    </span>
  )
}
