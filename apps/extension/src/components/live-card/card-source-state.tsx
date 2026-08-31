import type { ReactNode } from "react"
import type { LiveCardViewModel } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { useI18n } from "@/hooks/use-i18n"
import { PhInfo } from "../icons/ph"
import { SourceIcon } from "./source-icon"

interface SourceActionStateProps {
  icon?: string
  label: string
  onClick: () => void
  provider: LiveCardViewModel["provider"]
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
  provider: LiveCardViewModel["provider"]
  loginUrl: string
}) {
  const { t } = useI18n()
  return (
    <SourceActionState
      icon={icon}
      label={t("logIn")}
      onClick={() => window.open(loginUrl, "_blank")}
      provider={provider}
      title={t("logInTo", { provider: provider.title })}
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
  provider: LiveCardViewModel["provider"]
}) {
  const { t } = useI18n()
  return (
    <SourceActionState
      icon={icon}
      label={t("refresh")}
      onClick={onRefresh}
      provider={provider}
      title={t("refreshSource")}
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
  provider: LiveCardViewModel["provider"]
}) {
  const { t } = useI18n()
  return (
    <SourceActionState
      icon={icon}
      label={t("authorize")}
      onClick={() => void onRequestPermission()}
      provider={provider}
      title={t("authorizeSource")}
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
  message: ReactNode
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 max-h-24 overflow-y-auto border-t border-foreground/10 bg-background/45 px-3 py-2 backdrop-blur-sm scrollbar-hidden">
      <div className="flex items-start justify-center gap-1 text-pretty text-center text-xs leading-5 text-muted-foreground">
        <PhInfo className="mt-1 size-[1em] shrink-0" />
        <div className="min-w-0 flex-1">{message}</div>
      </div>
    </div>
  )
}
