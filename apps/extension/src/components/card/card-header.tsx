import type { SourceProvider } from "@newsnext/source/types"
import type { ReactNode } from "react"
import { Button } from "@newsnext/ui/components/button"
import { cn } from "@/lib/utils"
import { SourceIcon } from "./source-icon"

interface CardHeaderProps {
  badge?: string
  desc?: string
  home?: string
  icon?: string
  provider: SourceProvider
  title?: string
  subtitle: ReactNode
  actions: ReactNode
  className?: string
}

export function CardHeader({
  badge,
  desc,
  home,
  icon,
  provider,
  title,
  subtitle,
  actions,
  className,
}: CardHeaderProps) {
  const displayTitle = title || provider.title

  return (
    <div data-card-header className={cn("flex justify-between mb-3 items-center mx-1 gap-2", className)}>
      <div className="flex gap-2.5 items-center ml-1 min-w-0 flex-1">
        <Button
          type="button"
          variant="transparent"
          size="icon-sm"
          className="shrink-0 rounded-full transition-transform hover:scale-105"
          title={desc || provider.title}
          onClick={() => window.open(home || "#", "_blank")}
        >
          <SourceIcon
            badge={badge}
            className="rounded-full after:rounded-full"
            icon={icon}
            size="default"
            title={displayTitle}
          />
        </Button>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex max-w-full min-w-0 text-base">
            <span className="w-full min-w-0 truncate font-bold">
              {displayTitle}
            </span>
          </div>
          <span className="text-xs opacity-70 max-w-full truncate">
            {subtitle}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-theme-400" onClick={e => e.stopPropagation()}>
        {actions}
      </div>
    </div>
  )
}
