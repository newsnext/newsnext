import type { ReactNode } from "react"
import type { BoardSource } from "@/typings/source"
import { useCallback } from "react"
import PhWarningCircleDuotone from "~icons/ph/warning-circle-duotone"
import { cn } from "@/lib/utils"
import {
  PhArrowCounterClockwiseDuotone,
  PhLinkDuotone,
} from "../icons/ph"

interface SourceActionButtonProps {
  color: BoardSource["color"]
  fallbackIcon: ReactNode
  icon?: string
  label: string
  onClick: () => void
  preferSourceIcon?: boolean
  title: string
}

function SourceLogoIcon({
  className = "size-4 rounded-sm",
  icon,
  fallback,
}: {
  className?: string
  icon?: string
  fallback: ReactNode
}) {
  if (!icon) {
    return fallback
  }

  return (
    <img
      className={className}
      src={icon}
      alt=""
      referrerPolicy="no-referrer"
    />
  )
}

function SourceActionButton({
  color,
  fallbackIcon,
  icon,
  label,
  onClick,
  preferSourceIcon = false,
  title,
}: SourceActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-background/50 px-4 text-sm font-semibold shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-background/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        `border-${color}-400/25 text-${color}-400 focus-visible:ring-${color}-400`,
      )}
      aria-label={title}
      title={title}
    >
      {preferSourceIcon
        ? <SourceLogoIcon icon={icon} fallback={fallbackIcon} />
        : fallbackIcon}
      {label}
    </button>
  )
}

export function SourceLoginState({
  color,
  icon,
  providerTitle,
  loginUrl,
}: {
  color: BoardSource["color"]
  icon?: string
  providerTitle: string
  loginUrl: string
}) {
  const handleOpenLoginUrl = useCallback(() => {
    window.open(loginUrl, "_blank")
  }, [loginUrl])

  return (
    <div className="flex min-h-56 items-center justify-center px-4 text-center">
      <SourceActionButton
        color={color}
        fallbackIcon={<PhLinkDuotone className="text-base" />}
        icon={icon}
        label="Log in"
        onClick={handleOpenLoginUrl}
        preferSourceIcon
        title={`Log in to ${providerTitle}`}
      />
    </div>
  )
}

export function SourceErrorState({
  color,
  onRefresh,
}: {
  color: BoardSource["color"]
  onRefresh: () => void
}) {
  return (
    <div className="flex h-full min-h-56 items-center justify-center px-4 text-center">
      <SourceActionButton
        color={color}
        fallbackIcon={<PhArrowCounterClockwiseDuotone className="text-base" />}
        label="Refresh"
        onClick={onRefresh}
        title="Refresh source"
      />
    </div>
  )
}

export function SourceStatusPattern({
  icon,
}: {
  icon?: string
}) {
  if (!icon) {
    return null
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-8 rotate-[-8deg] opacity-[0.015] saturate-75 mix-blend-multiply dark:mix-blend-screen"
      style={{
        backgroundImage: `url(${icon})`,
        backgroundRepeat: "repeat",
        backgroundSize: "48px 48px",
      }}
    />
  )
}

export function SourceStatusMessage({
  icon,
  isLoginRequired,
  message,
}: {
  icon?: string
  isLoginRequired: boolean
  message: string
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 border-t border-foreground/10 bg-background/45 px-3 py-2 backdrop-blur-sm">
      <span className="line-clamp-2 text-pretty text-center text-xs leading-5 text-muted-foreground">
        {isLoginRequired
          ? (
              <SourceLogoIcon
                className="mr-1 inline size-[1em] rounded-[0.2em] align-[-0.125em]"
                icon={icon}
                fallback={<PhLinkDuotone className="mr-1 inline size-[1em] align-[-0.125em]" />}
              />
            )
          : (
              <PhWarningCircleDuotone className="mr-1 inline size-[1em] align-[-0.125em] text-red-500" />
            )}
        {message}
      </span>
    </div>
  )
}
