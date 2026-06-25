import type { AdvancedIframe } from "@newsnext/shared/types"
import type { CSSProperties, ReactNode } from "react"
import type { NewsItem } from "@/typings/source"
import { extractPictures } from "@newsnext/shared/types"
import { Button } from "@newsnext/ui/components/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@newsnext/ui/components/hover-card"
import { useIsMobile } from "@newsnext/ui/hooks/use-mobile"
import { useCallback } from "react"
import { cn } from "@/lib/utils"
import { useCardPreview } from "../card/card-context"
import { PhArrowsOutSimple } from "../icons/ph"
import { ProxiedImage } from "./proxied-image"

interface NewsItemLinkProps {
  item: NewsItem
  className?: string
  children: ReactNode
  previewSelection?: {
    selectedItemUrl?: string
    onSelectItem: (item: NewsItem) => void
  }
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

export function NewsItemLink({ item, className, children, previewSelection }: NewsItemLinkProps) {
  const isMobile = useIsMobile()
  const { canOpenExpandedPreview, canShowHoverPreview, onOpenExpandedPreview } = useCardPreview()
  const href = isMobile ? item.mobileUrl || item.url : item.url

  const hasPreview = item.preview?.html || item.preview?.text || item.preview?.picture || item.preview?.iframe
  const isPreviewSelected = previewSelection?.selectedItemUrl === item.url
  const handleSelectPreview = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!previewSelection) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    previewSelection.onSelectItem(item)
  }, [item, previewSelection])

  if (hasPreview && canShowHoverPreview) {
    return (
      <HoverCard>
        <HoverCardTrigger
          delay={600}
          render={props => (
            <NewsItemAnchor
              {...props}
              href={href}
              className={cn(className, isPreviewSelected && "bg-neutral-400/10")}
              onClick={(event) => {
                handleSelectPreview(event)
                props.onClick?.(event)
              }}
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
          {canOpenExpandedPreview && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3 z-10 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onOpenExpandedPreview(item)
              }}
            >
              <PhArrowsOutSimple />
            </Button>
          )}
          <NewsItemPreviewContent item={item} />
        </HoverCardContent>
      </HoverCard>
    )
  }

  return (
    <NewsItemAnchor
      href={href}
      className={cn(className, isPreviewSelected && "bg-neutral-400/10")}
      onClick={handleSelectPreview}
    >
      {children}
    </NewsItemAnchor>
  )
}

export function NewsItemPreviewContent({ item, className }: { item: NewsItem, className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {item.preview?.picture && extractPictures(item.preview.picture).map((picture, i) => {
        const { src, scale, radius } = picture
        return (
          <ProxiedImage
            key={i}
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
