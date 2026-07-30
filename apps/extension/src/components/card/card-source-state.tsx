import type { BoardSource } from "@/typings/source"
import { useCallback } from "react"
import { cn } from "@/lib/utils"
import { PhInfoDuotone } from "../icons/ph"
import { SourceIcon } from "./source-icon"

interface SourceActionStateProps {
  color: BoardSource["provider"]["color"]
  icon?: string
  label: string
  onClick: () => void
  provider: BoardSource["provider"]
  title: string
}

export function SourceActionState({
  color,
  icon,
  label,
  onClick,
  provider,
  title,
}: SourceActionStateProps) {
  return (
    <div className="flex h-full min-h-56 items-center justify-center px-4 text-center">
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
        <SourceIcon color={color} icon={icon} title={provider.title} />
        {label}
      </button>
    </div>
  )
}

export function SourceLoginState({
  color,
  icon,
  provider,
  loginUrl,
}: {
  color: BoardSource["provider"]["color"]
  icon?: string
  provider: BoardSource["provider"]
  loginUrl: string
}) {
  const handleOpenLoginUrl = useCallback(() => {
    window.open(loginUrl, "_blank")
  }, [loginUrl])

  return (
    <SourceActionState
      color={color}
      icon={icon}
      label="Log in"
      onClick={handleOpenLoginUrl}
      provider={provider}
      title={`Log in to ${provider.title}`}
    />
  )
}

export function SourceErrorState({
  color,
  icon,
  onRefresh,
  provider,
}: {
  color: BoardSource["provider"]["color"]
  icon?: string
  onRefresh: () => void
  provider: BoardSource["provider"]
}) {
  return (
    <SourceActionState
      color={color}
      icon={icon}
      label="Refresh"
      onClick={onRefresh}
      provider={provider}
      title="Refresh source"
    />
  )
}

export function SourcePermissionState({
  color,
  icon,
  onRequestPermission,
  provider,
}: {
  color: BoardSource["provider"]["color"]
  icon?: string
  onRequestPermission: () => Promise<boolean>
  provider: BoardSource["provider"]
}) {
  const handleAuthorize = useCallback(async () => {
    await onRequestPermission()
  }, [onRequestPermission])

  return (
    <SourceActionState
      color={color}
      icon={icon}
      label="Authorize"
      onClick={() => void handleAuthorize()}
      provider={provider}
      title="Authorize access to this browser source"
    />
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
  message,
}: {
  message: string
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 border-t border-foreground/10 bg-background/45 px-3 py-2 backdrop-blur-sm">
      <span className="line-clamp-2 text-pretty text-center text-xs leading-5 text-muted-foreground">
        <PhInfoDuotone className="mr-1 inline size-[1em] align-[-0.125em]" />
        {message}
      </span>
    </div>
  )
}
