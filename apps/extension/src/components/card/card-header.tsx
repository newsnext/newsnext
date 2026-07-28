import type { Color } from "@newsnext/shared/types"
import type { SourceProvider } from "@newsnext/source/types"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { SourceIcon } from "./source-icon"

interface CardHeaderProps {
  color: Color
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
  color,
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
  const displayProviderTitle = title ? provider.title.replace(/\s+/g, " ") : undefined
  const isDisplayTitleLonger = displayProviderTitle
    ? displayTitle.length >= displayProviderTitle.length
    : false

  return (
    <div className={cn("flex justify-between mb-3 items-center mx-1 gap-2", className)}>
      <div className="flex gap-2.5 items-center ml-1 min-w-0 flex-1">
        <button
          type="button"
          className="size-8 shrink-0 rounded-full cursor-pointer"
          title={desc || provider.title}
          onClick={() => window.open(home || "#", "_blank")}
        >
          <SourceIcon
            className="size-full rounded-full after:rounded-full"
            color={color}
            icon={icon}
            title={displayTitle}
          />
        </button>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex w-fit max-w-full items-center gap-2 min-w-0 text-base">
            <span
              className={cn(
                "font-bold truncate min-w-0",
                displayProviderTitle
                  ? isDisplayTitleLonger
                    ? "flex-[0_1_auto]"
                    : "max-w-full shrink-0"
                  : "w-full",
              )}
            >
              {displayTitle}
            </span>
            {displayProviderTitle && (
              <span
                className={cn(
                  "inline-block max-w-full truncate text-sm px-1.5 rounded-3xl text-center bg-background/50 opacity-80",
                  isDisplayTitleLonger ? "shrink-0" : "min-w-0 flex-[0_1_auto]",
                  `text-${color}-400`,
                )}
              >
                {displayProviderTitle}
              </span>
            )}
          </div>
          <span className="text-xs opacity-70 max-w-full truncate">
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
