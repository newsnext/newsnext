import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@newsnext/ui/components/avatar"
import { useState } from "react"
import PhRssSimpleDuotone from "~icons/ph/rss-simple-duotone"
import { cn } from "@/lib/utils"

function SourceIconBadge({ src }: { src: string }) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return null
  }

  return (
    <AvatarBadge className="!size-[44%] overflow-hidden !bg-transparent !p-0 text-transparent !ring-0">
      <img
        aria-hidden
        className="size-full rounded-full object-cover"
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    </AvatarBadge>
  )
}

interface SourceIconProps {
  className?: string
  icon?: string
  providerTitle: string
  sourceIcon?: string
}

export function SourceIcon({
  className,
  icon,
  providerTitle,
  sourceIcon,
}: SourceIconProps) {
  return (
    <Avatar className={cn("size-4 rounded-sm after:rounded-sm after:border-0", className)}>
      <AvatarImage
        className="rounded-[inherit]"
        src={icon}
        alt={`${providerTitle} icon`}
        referrerPolicy="no-referrer"
      />
      <AvatarFallback className="rounded-[inherit]">
        <PhRssSimpleDuotone aria-hidden className="size-1/2" />
      </AvatarFallback>
      {sourceIcon && <SourceIconBadge key={sourceIcon} src={sourceIcon} />}
    </Avatar>
  )
}
