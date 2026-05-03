import type { AdvancedIframe } from "@newsnext/shared/types"
import type { ReactNode } from "react"
import type { NewsItem } from "@/typings/source"
import { extractPictures } from "@newsnext/shared/types"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@newsnext/ui/components/hover-card"
import { useIsMobile } from "@newsnext/ui/hooks/use-mobile"
import { useCallback, useEffect, useRef, useState } from "react"
import { getAppURL } from "@/lib/env"
import { cn } from "@/lib/utils"

function getProxiedImageUrl(url: string): string {
  return getAppURL(`/api/p/${encodeURIComponent(url)}`)
}

interface ProxiedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  href?: string
  delay?: number
}

export function ProxiedImage({ src, href, onError, onClick, delay, ...props }: ProxiedImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [failed, setFailed] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(!delay)

  useEffect(() => {
    if (delay && !shouldLoad) {
      const timer = setTimeout(() => {
        setShouldLoad(true)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [delay, shouldLoad])

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (imgSrc === src) {
      // First error: try proxied URL
      setImgSrc(getProxiedImageUrl(src))
    } else {
      // Second error: mark as failed
      setFailed(true)
    }
    onError?.(e)
  }, [imgSrc, src, onError])

  const handleClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (href) {
      e.preventDefault()
      e.stopPropagation()
      window.open(href, "_blank", "noreferrer")
    }
    onClick?.(e)
  }, [href, onClick])

  if (failed) {
    return null
  }

  if (!shouldLoad) {
    return (
      <img
        referrerPolicy="no-referrer"
        alt="picture"
        src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg=="
        {...props}
      />
    )
  }

  return (
    <img
      referrerPolicy="no-referrer"
      alt="picture"
      src={imgSrc}
      onError={handleError}
      loading="lazy"
      onClick={handleClick}
      {...props}
    />
  )
}

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
      className={className}
    >
      {children}
    </a>
  )
}

export function NewsItemLink({ item, className, children }: NewsItemLinkProps) {
  const isMobile = useIsMobile()
  const href = isMobile ? item.mobileUrl || item.url : item.url

  const hasDetail = item.detail?.html || item.detail?.text || item.detail?.picture || item.detail?.iframe

  if (hasDetail) {
    return (
      <HoverCard>
        <HoverCardTrigger
          delay={600}
          render={props => (
            <NewsItemAnchor href={href} className={className} {...props}>
              {children}
            </NewsItemAnchor>
          )}
        />
        <HoverCardContent side="right" align="start" alignOffset={0} className="max-h-96 overflow-y-auto scrollbar-hidden">
          <div className="flex flex-col gap-2">
            {item.detail?.picture && extractPictures(item.detail.picture).map((picture, i) => {
              const { src, scale, radius } = picture
              return (
                <ProxiedImage
                  key={i}
                  src={src}
                  referrerPolicy="no-referrer"
                  alt="detail picture"
                  style={{
                    transform: `scale(${scale ?? 1})`,
                    borderRadius: `${radius ?? 12}px`,
                  }}
                  className="max-w-full"
                />
              )
            })}
            {item.detail?.iframe && <DetailIframe iframe={item.detail.iframe} />}
            {item.detail?.html
              ? (
                  <DetailHtml html={item.detail.html} />
                )
              : item.detail?.text && (
                <span className="whitespace-pre-wrap wrap-break-word">
                  {item.detail?.text}
                </span>
              )}
          </div>
        </HoverCardContent>
      </HoverCard>
    )
  }

  return (
    <NewsItemAnchor href={href} className={className}>
      {children}
    </NewsItemAnchor>
  )
}

function DetailIframe({ iframe }: { iframe: AdvancedIframe | string }) {
  const props = typeof iframe === "string" ? { src: iframe } : iframe
  const ref = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)

  if (!props?.src) return null

  useEffect(() => {
    if (loaded && ref.current) {
      const contentWindow = ref.current.contentWindow
      console.log(contentWindow)
    }
  }, [props.src])

  const { className, loading, width, height, ...rest } = props

  return (
    <iframe
      ref={ref}
      {...rest}
      src={props.src}
      width={width ?? "100%"}
      height={height ?? "320"}
      className={cn("w-full rounded-3xl", className)}
      loading={loading ?? "lazy"}
      onLoad={() => {
        setLoaded(true)
      }}
    />
  )
}

function DetailHtml({ html }: { html: string }) {
  return (
    <div
      className="whitespace-pre-wrap wrap-break-word"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export function NewsItemInfo({ item, className }: { item: NewsItem, className?: string }) {
  const hasMeta = item?.meta?.html || item?.meta?.text
  const hasMark = item?.meta?.mark

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
        {item.meta?.html && <span dangerouslySetInnerHTML={{ __html: item.meta.html }} />}
        {item.meta?.text && <span>{item.meta.text}</span>}
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
    <span className={cn("self-start leading-none space-x-1", className)}>
      {item.meta?.icon && extractPictures(item.meta.icon).map((icon, i) => {
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
      {item.meta && (
        <NewsItemInfo item={item} className="truncate align-middle max-w-80 inline-block" />
      )}
    </span>
  )
}
