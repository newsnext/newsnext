import type { ReactNode } from "react"
import type { NewsItem, SemanticPicture } from "@/typings/source"
import { ProxiedImage } from "@newsnext/ui/components/proxied-image"
import { cn } from "@/lib/utils"
import { NewsItemStats } from "./news-item-stats"

export function SemanticImage({ picture, className, scale, delay }: {
  picture: SemanticPicture
  className?: string
  scale?: number
  delay?: number
}): ReactNode {
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

function getDefaultInlineText(item: NewsItem): string {
  const values: string[] = []
  if (item.author && item.icon?.kind !== "author") values.push(item.author.name)
  if (item.attributes) values.push(...Object.values(item.attributes).map(String))
  return values.join(" · ")
}

interface NewsItemInlineProps {
  item: NewsItem
  inlineText?: string
  inlineSuffix?: ReactNode
  markScale?: number
  className?: string
  truncate?: boolean
  size?: "default" | "large"
}

export function NewsItemInline({
  item,
  inlineText: renderedInlineText,
  inlineSuffix,
  markScale,
  className,
  truncate = true,
  size = "default",
}: NewsItemInlineProps): ReactNode {
  const inlineText = renderedInlineText || getDefaultInlineText(item)
  if (!item.mark && !inlineText && !inlineSuffix && !item.stats) return null

  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 align-middle leading-none text-neutral-400/80", className)}>
      {item.mark && (
        <SemanticImage
          picture={item.mark}
          scale={markScale}
          className={size === "large" ? "h-5" : undefined}
        />
      )}
      {(inlineText || inlineSuffix) && (
        <span className={cn(
          "inline-flex min-w-0 self-center items-center",
          size === "large" ? "h-5 text-sm leading-5" : "h-3.5 text-xs leading-3.5",
          truncate ? "max-w-80 truncate" : "whitespace-normal wrap-break-word",
        )}
        >
          {inlineText}
          {inlineText && inlineSuffix && <span className="mx-1">·</span>}
          {inlineSuffix}
        </span>
      )}
      <NewsItemStats item={item} size={size} />
    </span>
  )
}
