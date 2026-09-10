import type { ComponentProps, ReactNode } from "react"
import { Button } from "@newsnext/ui/components/button"
import { cn } from "@newsnext/ui/lib/utils"
import { SourceIcon } from "./source-icon"

export type LiveCardDragHandleRef = (node: HTMLDivElement | null) => void

interface LiveCardHeaderProps {
  avatarSeed?: string
  badge?: string
  desc?: string
  home?: string
  icon?: string
  providerTitle: string
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
  avatarSeed,
  badge,
  desc,
  home,
  icon,
  providerTitle,
  title,
  actions,
  dragHandleRef,
}: LiveCardHeaderProps): React.JSX.Element {
  const displayTitle = title || providerTitle
  const isDraggable = dragHandleRef !== undefined
  return (
    <div
      ref={dragHandleRef}
      data-live-card-header
      aria-label={isDraggable ? `Drag to move ${displayTitle}` : undefined}
      role={isDraggable ? "group" : undefined}
      className={cn("mx-1 mb-2 flex min-h-8 shrink-0 items-center justify-between gap-2", isDraggable && "cursor-grab active:cursor-grabbing")}
    >
      <div className="ml-1 flex min-w-0 flex-1 items-center gap-2.5">
        <Button
          data-live-card-drag-excluded
          type="button"
          variant="transparent"
          size="icon-sm"
          className="shrink-0 cursor-auto rounded-full transition-transform hover:scale-105"
          title={desc || providerTitle}
          onClick={home ? () => window.open(home, "_blank") : undefined}
        >
          <SourceIcon avatarSeed={avatarSeed ?? providerTitle} badge={badge} icon={icon} size="default" title={displayTitle} />
        </Button>
        <span className="min-w-0 flex-1 truncate text-base font-bold">{displayTitle}</span>
      </div>
      <div data-live-card-drag-excluded className="flex shrink-0 cursor-auto items-center gap-1 text-theme-400" onClick={event => event.stopPropagation()}>
        {actions}
      </div>
    </div>
  )
}
