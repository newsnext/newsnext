import { useCallback, useEffect, useState } from "react"
import { getApiUrl } from "@/lib/env"

function getProxiedImageUrl(url: string): string {
  return getApiUrl(`/p/${encodeURIComponent(url)}`)
}

interface ProxiedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  href?: string
  delay?: number
}

export function ProxiedImage({ src, href, onError, onClick, delay, ...props }: ProxiedImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [readySrc, setReadySrc] = useState(delay ? "" : src)
  const proxiedSrc = getProxiedImageUrl(src)
  const imgSrc = failedSrc === src ? proxiedSrc : src
  const failed = failedSrc === proxiedSrc
  const shouldLoad = !delay || readySrc === src

  useEffect(() => {
    if (delay && !shouldLoad) {
      const timer = setTimeout(() => {
        setReadySrc(src)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [delay, shouldLoad, src])

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setFailedSrc(imgSrc)
    onError?.(e)
  }, [imgSrc, onError])

  const handleClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (href) {
      e.preventDefault()
      e.stopPropagation()
      window.open(href, "_blank", "noreferrer")
    }
    onClick?.(e)
  }, [href, onClick])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLImageElement>) => {
    if (e.key !== "Enter" && e.key !== " ") {
      return
    }

    e.preventDefault()
    e.currentTarget.click()
  }, [])

  if (failed) {
    return null
  }

  if (!shouldLoad) {
    return (
      <img
        referrerPolicy="no-referrer"
        alt=""
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
      onKeyDown={href || onClick ? handleKeyDown : undefined}
      role={href || onClick ? "button" : undefined}
      tabIndex={href || onClick ? 0 : undefined}
      {...props}
    />
  )
}
