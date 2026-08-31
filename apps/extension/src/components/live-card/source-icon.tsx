import type { Color } from "@newsnext/shared/types"
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@newsnext/ui/components/avatar"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"

interface SourceIconProps {
  badge?: string
  className?: string
  color?: Color
  icon?: string
  size?: "default" | "xs" | "sm"
  title: string
}

export function SourceIcon({
  badge,
  className,
  color,
  icon,
  size = "xs",
  title,
}: SourceIconProps) {
  const { t } = useI18n()
  return (
    <Avatar
      className={cn("rounded-sm after:rounded-sm after:border-0", color, className)}
      size={size}
    >
      <AvatarImage
        className="rounded-[inherit]"
        src={icon}
        alt={t("sourceIconAlt", { title })}
        referrerPolicy="no-referrer"
      />
      <AvatarFallback className="rounded-[inherit] bg-theme-400" />
      {badge && (
        <AvatarBadge className="-right-0.5 -bottom-0.5 overflow-hidden bg-transparent drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] ring-0">
          <img
            className="size-full rounded-full object-cover"
            src={badge}
            alt={t("sourceBadgeAlt", { title })}
            referrerPolicy="no-referrer"
          />
        </AvatarBadge>
      )}
    </Avatar>
  )
}
