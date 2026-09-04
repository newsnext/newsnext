import type { SourceProvider } from "@newsnext/source-kit/types"
import type { ComponentProps, ReactNode } from "react"
import { Button } from "@newsnext/ui/components/button"
import { cn } from "@/lib/utils"
import { SourceIcon } from "./source-icon"

export type LiveCardDragHandleRef = (node: HTMLDivElement | null) => void

interface LiveCardHeaderProps {
  badge?: string
  desc?: string
  home?: string
  icon?: string
  provider: SourceProvider
  title?: string
  subtitle: ReactNode
  actions: ReactNode
  className?: string
  dragHandleRef?: LiveCardDragHandleRef
}

type LiveCardHeaderActionButtonProps = Omit<ComponentProps<typeof Button>, "size" | "variant">

export function LiveCardHeaderActionButton({ className, ...props }: LiveCardHeaderActionButtonProps): React.JSX.Element {
  return (
    <Button
      variant="transparent"
      size="icon-fit"
      className={cn("border-0 text-lg opacity-50 hover:opacity-85 active:not-aria-[haspopup]:translate-y-0", className)}
      {...props}
    />
  )
}

export function LiveCardHeader({
  badge,
  desc,
  home,
  icon,
  provider,
  title,
  subtitle,
  actions,
  className,
  dragHandleRef,
}: LiveCardHeaderProps) {
  const displayTitle = title || provider.title
  const isDraggable = dragHandleRef !== undefined

  return (
    <div
      ref={dragHandleRef}
      data-live-card-header
      aria-label={isDraggable ? `Drag to move ${displayTitle}` : undefined}
      role={isDraggable ? "group" : undefined}
      className={cn(
        "flex justify-between mb-3 items-center mx-1 gap-2",
        isDraggable && "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      <div className="flex gap-2.5 items-center ml-1 min-w-0 flex-1">
        <Button
          data-live-card-drag-excluded
          type="button"
          variant="transparent"
          size="icon-sm"
          className="shrink-0 cursor-auto rounded-full transition-transform hover:scale-105"
          title={desc || provider.title}
          onClick={() => window.open(home || "#", "_blank")}
        >
          <SourceIcon
            badge={badge}
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
      <div
        data-live-card-drag-excluded
        className="flex shrink-0 cursor-auto items-center gap-1 text-theme-400"
        onClick={e => e.stopPropagation()}
      >
        {actions}
      </div>
    </div>
  )
}
