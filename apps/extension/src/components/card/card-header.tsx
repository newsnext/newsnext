import type { Color } from "@newsnext/shared/types"
import type { ReactNode } from "react"
import { getFavicon } from "@newsnext/shared/utils"
import { cn } from "@/lib/utils"

interface CardHeaderProps {
  color: Color
  desc?: string
  home?: string
  icon?: string
  providerTitle: string
  title?: string
  subtitle: ReactNode
  actions: ReactNode
  className?: string
}

export function CardHeader({
  color,
  desc,
  home,
  icon,
  providerTitle,
  title,
  subtitle,
  actions,
  className,
}: CardHeaderProps) {
  const displayTitle = title || providerTitle
  const displayProviderTitle = title ? providerTitle.replace(/\s+/g, " ") : undefined

  return (
    <div className={cn("flex justify-between mb-3 items-center mx-1 gap-2", className)}>
      <div className="flex gap-2.5 items-center ml-1 min-w-0 flex-1">
        <button
          type="button"
          className="size-8 shrink-0 rounded-full"
          title={desc || providerTitle}
          onClick={() => window.open(home || "#", "_blank")}
        >
          <img
            className="size-full rounded-full bg-cover"
            src={icon}
            alt={`${providerTitle} icon`}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = getFavicon(home || "#")!
            }}
          />
        </button>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 min-w-0 w-full text-base">
            <span
              className={cn(
                "font-bold truncate min-w-0",
                displayProviderTitle ? "shrink-0 max-w-[min(14rem,80%)]" : "w-full",
              )}
            >
              {displayTitle}
            </span>
            {displayProviderTitle && (
              <span
                className={cn(
                  "inline-block min-w-0 flex-1 truncate text-sm px-1.5 rounded-3xl text-center bg-background/50 opacity-80",
                  `text-${color}-400`,
                )}
              >
                {displayProviderTitle}
              </span>
            )}
          </div>
          <span className="text-xs opacity-70">
            {subtitle}
          </span>
        </div>
      </div>
      <div className={cn("flex gap-1 items-center shrink-0", `text-${color}-400`)} onClick={e => e.stopPropagation()}>
        {actions}
      </div>
    </div>
  )
}
