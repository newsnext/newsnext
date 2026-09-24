import type { Color } from "@newsnext/shared/types"
import type { ReactNode } from "react"
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
} from "@newsnext/ui/components/avatar"
import { cn } from "@newsnext/ui/lib/utils"
import { useState } from "react"
import { CardAvatar } from "@/components/card-shell/card-avatar"
import { useI18n } from "@/hooks/use-i18n"

interface SourceIconProps {
  avatarSeed?: string
  badge?: string
  className?: string
  color?: Color
  icon?: string
  size?: "default" | "xs" | "sm"
  title: string
}

function SourceIconImage({ icon, alt, fallback }: {
  icon: string
  alt: string
  fallback: ReactNode
}): ReactNode {
  const [failed, setFailed] = useState(false)

  if (failed) return fallback

  return (
    <img
      className="aspect-square size-full rounded-[inherit] object-cover"
      src={icon}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}

export function SourceIcon({
  avatarSeed,
  badge,
  className,
  color,
  icon,
  size = "xs",
  title,
}: SourceIconProps): ReactNode {
  const { t } = useI18n()
  const alt = t("sourceIconAlt", { title })
  const fallback = (
    <AvatarFallback className="rounded-[inherit] bg-theme-400">
      <CardAvatar seed={avatarSeed ?? title} title={alt} />
    </AvatarFallback>
  )
  return (
    <Avatar
      className={cn("rounded-full after:rounded-full after:border-0", color, className)}
      size={size}
    >
      {icon
        ? <SourceIconImage key={icon} icon={icon} alt={alt} fallback={fallback} />
        : fallback}
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
