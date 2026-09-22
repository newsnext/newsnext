import { useState } from "react"
import { cn } from "../lib/utils"

export interface ProxiedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string
}

export function ProxiedImage({ src, className, onLoad, onError, ...props }: ProxiedImageProps): React.JSX.Element {
  const [settledSrc, setSettledSrc] = useState("")
  const settled = settledSrc === src

  return (
    <img
      referrerPolicy="no-referrer"
      alt=""
      src={src}
      loading="lazy"
      className={cn(
        "transition-[opacity,background-color] duration-200",
        settled ? "opacity-100" : "animate-pulse bg-muted opacity-60",
        className,
      )}
      onLoad={(event) => {
        setSettledSrc(src)
        onLoad?.(event)
      }}
      onError={(event) => {
        setSettledSrc(src)
        onError?.(event)
      }}
      {...props}
    />
  )
}
