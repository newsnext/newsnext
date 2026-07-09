import { useCallback, useEffect, useState } from "react"
import { getApiUrl } from "@/lib/env"

function getProxiedImageUrl(url: string): string {
  return getApiUrl(`/p/${encodeURIComponent(url)}`)
}

interface ProxiedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string
  delay?: number
}

export function ProxiedImage({ src, onError, delay, ...props }: ProxiedImageProps) {
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
    if (imgSrc === proxiedSrc) {
      onError?.(e)
    }
  }, [imgSrc, onError, proxiedSrc])

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
        draggable={false}
      />
    )
  }

  return (
    <img
      referrerPolicy="no-referrer"
      alt=""
      src={imgSrc}
      onError={handleError}
      loading="lazy"
      {...props}
      draggable={false}
    />
  )
}
