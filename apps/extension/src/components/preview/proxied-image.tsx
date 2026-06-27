import { useCallback, useEffect, useState } from "react"

interface ProxiedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "onClick" | "src"> {
  src: string
  href?: string
  delay?: number
  onClick?: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>
}

export function ProxiedImage({ src, href, onError, onClick, delay, ...props }: ProxiedImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [readySrc, setReadySrc] = useState(delay ? "" : src)
  const failed = failedSrc === src
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
    setFailedSrc(src)
    onError?.(e)
  }, [src, onError])

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

  const image = (
    <img
      referrerPolicy="no-referrer"
      alt=""
      src={src}
      onError={handleError}
      loading="lazy"
      {...props}
    />
  )

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={onClick}
      >
        {image}
      </a>
    )
  }

  if (onClick) {
    return (
      <button type="button" className="contents" onClick={onClick}>
        {image}
      </button>
    )
  }

  return image
}
