import type { CardViewModel } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { PhInfo } from "../icons/ph"
import { SourceIcon } from "./source-icon"

interface SourceActionStateProps {
  icon?: string
  label: string
  onClick: () => void
  provider: CardViewModel["provider"]
  title: string
}

function SourceActionState({
  icon,
  label,
  onClick,
  provider,
  title,
}: SourceActionStateProps) {
  return (
    <div className="flex h-full min-h-56 items-center justify-center px-4 text-center">
      <Button
        type="button"
        variant="outline"
        tone="theme"
        onClick={onClick}
        className="h-10 gap-2 bg-background/50 px-4 font-semibold shadow-sm backdrop-blur"
        aria-label={title}
        title={title}
      >
        <SourceIcon icon={icon} title={provider.title} />
        {label}
      </Button>
    </div>
  )
}

export function SourceLoginState({
  icon,
  provider,
  loginUrl,
}: {
  icon?: string
  provider: CardViewModel["provider"]
  loginUrl: string
}) {
  return (
    <SourceActionState
      icon={icon}
      label="Log in"
      onClick={() => window.open(loginUrl, "_blank")}
      provider={provider}
      title={`Log in to ${provider.title}`}
    />
  )
}

export function SourceErrorState({
  icon,
  onRefresh,
  provider,
}: {
  icon?: string
  onRefresh: () => void
  provider: CardViewModel["provider"]
}) {
  return (
    <SourceActionState
      icon={icon}
      label="Refresh"
      onClick={onRefresh}
      provider={provider}
      title="Refresh source"
    />
  )
}

export function SourcePermissionState({
  icon,
  onRequestPermission,
  provider,
}: {
  icon?: string
  onRequestPermission: () => Promise<boolean>
  provider: CardViewModel["provider"]
}) {
  return (
    <SourceActionState
      icon={icon}
      label="Authorize"
      onClick={() => void onRequestPermission()}
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
        <PhInfo className="mr-1 inline size-[1em] align-[-0.125em]" />
        {message}
      </span>
    </div>
  )
}
