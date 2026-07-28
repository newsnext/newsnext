import type { Color } from "@newsnext/shared/types"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@newsnext/ui/components/avatar"
import { cn } from "@/lib/utils"

interface SourceIconProps {
  className?: string
  color: Color
  icon?: string
  title: string
}

export function SourceIcon({
  className,
  color,
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
      <AvatarFallback className={cn("rounded-[inherit]", `bg-${color}-400`)} />
    </Avatar>
  )
}
