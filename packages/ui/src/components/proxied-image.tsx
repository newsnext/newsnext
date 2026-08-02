import { useEffect, useState } from "react"

export interface ProxiedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string
  delay?: number
}

export function ProxiedImage({ src, onError, delay, ...props }: ProxiedImageProps): React.JSX.Element {
  const [readySrc, setReadySrc] = useState(delay ? "" : src)
  const shouldLoad = !delay || readySrc === src

  useEffect(() => {
    if (delay && !shouldLoad) {
      const timer = setTimeout(() => {
        setReadySrc(src)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [delay, shouldLoad, src])

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
      alt=""
      src={src}
      onError={onError}
      loading="lazy"
      {...props}
    />
  )
}
