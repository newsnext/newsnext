import type { AdvancedIframe } from "@newsnext/shared/types"
import type { CSSProperties, ReactNode } from "react"
import type { NewsItem } from "@/typings/source"
import { extractPictures } from "@newsnext/shared/types"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@newsnext/ui/components/hover-card"
import { cn } from "@/lib/utils"
import { useCardPreview } from "../card/card-context"
import { ProxiedImage } from "./proxied-image"

interface NewsItemLinkProps {
  item: NewsItem
  className?: string
  children: ReactNode
}

interface NewsItemAnchorProps extends React.ComponentPropsWithoutRef<"a"> {
  href: string
  className?: string
  children: ReactNode
}

function NewsItemAnchor({ href, className, children, ...props }: NewsItemAnchorProps) {
  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn("visited:text-neutral-500 dark:visited:text-neutral-400", className)}
    >
      {children}
    </a>
  )
}

export function NewsItemLink({ item, className, children }: NewsItemLinkProps) {
  const { canShowHoverPreview } = useCardPreview()
  const href = item.url

  const hasPreview = item.preview?.html || item.preview?.text || item.preview?.picture || item.preview?.iframe

  if (hasPreview && canShowHoverPreview) {
    return (
      <HoverCard>
        <HoverCardTrigger
          delay={600}
          render={props => (
            <NewsItemAnchor
              {...props}
              href={href}
              className={className}
            >
              {children}
            </NewsItemAnchor>
          )}
        />
        <HoverCardContent
          side="left"
          align="start"
          alignOffset={0}
          radius="3xl"
          surfaceClassName="max-h-96 overflow-y-auto scrollbar-hidden"
        >
          <NewsItemPreviewContent item={item} />
        </HoverCardContent>
      </HoverCard>
    )
  }

  return (
    <NewsItemAnchor
      href={href}
      className={className}
    >
      {children}
    </NewsItemAnchor>
  )
}

export function NewsItemPreviewContent({ item, className }: { item: NewsItem, className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {item.preview?.picture && extractPictures(item.preview.picture).map((picture) => {
        const { src, scale, radius } = picture
        return (
          <ProxiedImage
            key={src}
            src={src}
            referrerPolicy="no-referrer"
            alt="preview picture"
            style={{
              transform: `scale(${scale ?? 1})`,
              borderRadius: `${radius ?? 12}px`,
            }}
            className="max-w-full"
          />
        )
      })}
      {item.preview?.iframe && <PreviewIframe iframe={item.preview.iframe} />}
      {item.preview?.html
        ? (
            <PreviewHtml html={item.preview.html} />
          )
        : item.preview?.text
          ? (
              <span className="whitespace-pre-wrap wrap-break-word">
                {item.preview?.text}
              </span>
            )
          : (
              <span className="text-muted-foreground">
                No preview available for this item.
              </span>
            )}
    </div>
  )
}

function PreviewIframe({ iframe }: { iframe: AdvancedIframe | string }) {
  const props = typeof iframe === "string" ? { src: iframe } : iframe

  if (!props?.src) return null

  const { className, loading, width, height, aspectRatio = 16 / 9, style, title, sandbox, ...rest } = props
  const shouldUseAspectRatio = height == null && style?.height == null && aspectRatio != null && aspectRatio > 0
  const iframeStyle: CSSProperties | undefined = shouldUseAspectRatio
    ? { ...style, aspectRatio, height: "auto" }
    : style

  return (
    <iframe
      {...rest}
      src={props.src}
      width={width ?? "100%"}
      height={height ?? (shouldUseAspectRatio ? undefined : "320")}
      style={iframeStyle}
      className={cn("w-full rounded-xl", className)}
      loading={loading ?? "lazy"}
      sandbox={sandbox ?? "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"}
      title={title ?? "News item preview"}
    />
  )
}

function PreviewHtml({ html }: { html: string }) {
  return (
    <div
      className="whitespace-pre-wrap wrap-break-word"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
