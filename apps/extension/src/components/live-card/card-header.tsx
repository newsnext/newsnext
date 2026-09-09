import type { SourceProvider } from "@newsnext/source-kit/types"
import type { ComponentProps, ReactNode } from "react"
import { Button } from "@newsnext/ui/components/button"
import { cn } from "@newsnext/ui/lib/utils"
import { SourceIcon } from "./source-icon"

export type LiveCardDragHandleRef = (node: HTMLDivElement | null) => void

interface LiveCardHeaderProps {
  badge?: string
  desc?: string
  home?: string
  icon?: string
  provider: SourceProvider
  title?: string
  actions: ReactNode
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
  actions,
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
        "flex justify-between mb-2 items-center mx-1 gap-2",
        isDraggable && "cursor-grab active:cursor-grabbing",
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
        <span className="min-w-0 flex-1 truncate text-base font-bold">
          {displayTitle}
        </span>
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
