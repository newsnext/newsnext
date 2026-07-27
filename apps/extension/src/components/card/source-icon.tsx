import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@newsnext/ui/components/avatar"
import PhRssSimpleDuotone from "~icons/ph/rss-simple-duotone"
import { cn } from "@/lib/utils"

interface SourceIconProps {
  className?: string
  icon?: string
  title: string
}

export function SourceIcon({
  className,
  icon,
  title,
}: SourceIconProps) {
  return (
    <Avatar className={cn("size-4 rounded-sm after:rounded-sm after:border-0", className)}>
      <AvatarImage
        className="rounded-[inherit]"
        src={icon}
        alt={`${title} icon`}
        referrerPolicy="no-referrer"
      />
      <AvatarFallback className="rounded-[inherit]">
        <PhRssSimpleDuotone aria-hidden className="size-1/2" />
      </AvatarFallback>
    </Avatar>
  )
}
