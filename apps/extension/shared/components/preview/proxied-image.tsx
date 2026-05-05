import { useCallback, useEffect, useState } from "react"
import { getAppURL } from "@/lib/env"

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
    setImgSrc(src)
    setFailed(false)
    setShouldLoad(!delay)
  }, [src, delay])

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
