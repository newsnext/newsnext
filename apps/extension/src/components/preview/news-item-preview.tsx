import type { AdvancedIframe } from "@newsnext/shared/types"
import type { CSSProperties, ReactNode } from "react"
import type { NewsItem } from "@/typings/source"
import { extractPictures } from "@newsnext/shared/types"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@newsnext/ui/components/hover-card"
import { useId, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { SafeHtml } from "../common/safe-html"
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
  const href = item.url

  const hasPreview = item.preview?.html || item.preview?.text || item.preview?.picture || item.preview?.iframe

  if (hasPreview) {
    return <PreviewNewsItemLink item={item} href={href} className={className}>{children}</PreviewNewsItemLink>
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

function PreviewNewsItemLink({ item, href, className, children }: NewsItemLinkProps & { href: string }) {
  const triggerId = useId()
  const pictures = useMemo(
    () => item.preview?.picture ? extractPictures(item.preview.picture).map(picture => picture.src) : [],
    [item.preview?.picture],
  )
  const [open, setOpen] = useState(false)
  const [picturesReady, setPicturesReady] = useState(pictures.length === 0)
  const settledPicturesRef = useRef(new Set<number>())

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen)
  }

  const handlePictureSettled = (index: number): void => {
    if (settledPicturesRef.current.has(index)) {
      return
    }

    settledPicturesRef.current.add(index)
    if (settledPicturesRef.current.size === pictures.length) {
      setPicturesReady(true)
    }
  }

  return (
    <HoverCard open={open} triggerId={open ? triggerId : null} onOpenChange={handleOpenChange}>
      <HoverCardTrigger
        id={triggerId}
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
        aria-hidden={!picturesReady}
        className={cn("transition-opacity", !picturesReady && "invisible pointer-events-none opacity-0")}
        surfaceClassName="max-h-96 overflow-y-auto scrollbar-hidden"
      >
        <NewsItemPreviewContent item={item} onPictureSettled={handlePictureSettled} />
      </HoverCardContent>
    </HoverCard>
  )
}

export function NewsItemPreviewContent({
  item,
  className,
  onPictureSettled,
}: {
  item: NewsItem
  className?: string
  onPictureSettled?: (index: number) => void
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {item.preview?.picture && extractPictures(item.preview.picture).map((picture, index) => {
        const { src, scale, radius } = picture
        return (
          <ProxiedImage
            key={`${src}-${scale ?? 1}-${radius ?? 12}`}
            src={src}
            referrerPolicy="no-referrer"
            alt="preview picture"
            loading="eager"
            onLoad={() => onPictureSettled?.(index)}
            onError={() => onPictureSettled?.(index)}
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
        : item.preview?.text && (
          <span className="whitespace-pre-wrap wrap-break-word">
            {item.preview?.text}
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
    <SafeHtml
      as="div"
      className="whitespace-pre-wrap wrap-break-word"
      html={html}
    />
  )
}
