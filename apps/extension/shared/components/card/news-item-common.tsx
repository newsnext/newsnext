import type { ReactNode } from "react"
import type { NewsItem } from "@/typings/source"
import { extractPictures } from "@newsnext/shared/types"
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
  href?: string
}

export function ProxiedImage({ src, href, onError, onClick, ...props }: ProxiedImageProps) {
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

  const handleClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (href) {
      e.preventDefault()
      e.stopPropagation()
      window.open(href, "_blank", "noreferrer")
    }
    onClick?.(e)
  }, [href, onClick])

  return (
    <img
      referrerPolicy="no-referrer"
      alt="picture"
      src={imgSrc}
      onError={handleError}
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

  const hasDetail = item.detail?.html || item.detail?.text || item.detail?.picture

  if (hasDetail) {
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
            {item.detail?.html
              ? (
                  <div
                    className="whitespace-pre-wrap wrap-break-word"
                    dangerouslySetInnerHTML={{ __html: item.detail.html }}
                  />
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
