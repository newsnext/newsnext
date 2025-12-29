import type { ReactNode } from "react"
import type { NewsItem } from "@/typings/source"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@newsnext/ui/components/hover-card"
import { useIsMobile } from "@newsnext/ui/hooks/use-mobile"
import { useCallback, useState } from "react"
import { BASE_URL } from "@/lib/env"
import { cn } from "@/lib/utils"

function getProxiedImageUrl(url: string): string {
  return `${BASE_URL}/api/p/${encodeURIComponent(url)}`
}

interface ProxiedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
}

function ProxiedImage({ src, onError, ...props }: ProxiedImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [failed, setFailed] = useState(false)

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

  if (failed) {
    return null
  }

  return (
    <img
      referrerPolicy="no-referrer"
      alt="picture"
      src={imgSrc}
      onError={handleError}
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

  const hasDetail = item.detail?.html || item.detail?.text || item.detail?.picture

  if (hasDetail) {
    const detailPicture = item.detail?.picture
    return (
      <HoverCard>
        <HoverCardTrigger
          render={props => (
            <NewsItemAnchor href={href} className={className} {...props}>
              {children}
            </NewsItemAnchor>
          )}
        />
        <HoverCardContent side="right" align="start" alignOffset={0} className="max-h-96 overflow-y-auto scrollbar-hidden">
          <div className="flex flex-col gap-2">
            {detailPicture && (() => {
              const { url, scale, radius } = typeof detailPicture === "string" ? { url: detailPicture, scale: undefined, radius: undefined } : detailPicture
              return (
                <ProxiedImage
                  src={url}
                  referrerPolicy="no-referrer"
                  alt="detail picture"
                  style={{
                    transform: `scale(${scale ?? 1})`,
                    borderRadius: `${radius ?? 12}px`,
                  }}
                  className="max-w-full"
                />
              )
            })()}
            {item.detail?.html
              && (
                <span
                  className="whitespace-pre-wrap wrap-break-word"
                  dangerouslySetInnerHTML={{ __html: item.detail.html }}
                />
              )}
            {item.detail?.text && (
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

export function NewsItemInfo({ item, className }: { item: NewsItem, className?: string }) {
  const hasInfo = item?.info?.html || item?.info?.text
  const hasPicture = item?.info?.picture

  if (!hasInfo && !hasPicture) {
    return null
  }

  return (
    <>
      {hasPicture && (() => {
        const { url, scale, radius } = typeof hasPicture === "string" ? { url: hasPicture, scale: undefined, radius: undefined } : hasPicture
        return (
          <ProxiedImage
            src={url}
            style={{
              transform: `scale(${scale ?? 1})`,
              borderRadius: `${radius ?? 4}px`,
            }}
            className="h-4 inline -mt-1 mr-1"
          />
        )
      })()}
      <span className={cn("text-xs text-neutral-400/80 space-x-1", className)}>
        {item.info?.html && <span dangerouslySetInnerHTML={{ __html: item.info.html }} />}
        {item.info?.text && <span>{item.info.text}</span>}
      </span>
    </>
  )
}
