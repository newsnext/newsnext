import type { ReactNode } from "react"
import { Button } from "@newsnext/ui/components/button"
import { useI18n } from "@/hooks/use-i18n"
import { PhInfo } from "../icons/ph"
import { useLiveCardIdentity } from "./live-card-identity-context"
import { SourceIcon } from "./source-icon"

interface SourceActionStateProps {
  disabled?: boolean
  label: string
  onClick: () => void
  title: string
}

function SourceActionState({
  disabled,
  label,
  onClick,
  title,
}: SourceActionStateProps) {
  const identity = useLiveCardIdentity()
  return (
    <div className="flex h-full min-h-56 items-center justify-center px-4 text-center">
      <Button
        type="button"
        disabled={disabled}
        variant="outline"
        tone="theme"
        onClick={onClick}
        className="h-10 gap-2 bg-background/50 px-4 font-semibold shadow-sm backdrop-blur"
        aria-label={title}
        title={title}
      >
        <SourceIcon badge={identity.badge} icon={identity.icon} title={identity.name} />
        {label}
      </Button>
    </div>
  )
}

export function SourceWorkerTakeoverState({
  disabled,
  onTakeOver,
}: {
  disabled: boolean
  onTakeOver: () => void
}) {
  const { t } = useI18n()
  return (
    <SourceActionState
      disabled={disabled}
      label={disabled ? t("takingOver") : t("takeOver")}
      onClick={onTakeOver}
      title={t("takeOverLiveCard")}
    />
  )
}

export function SourceLoginState({
  providerTitle,
  loginUrl,
}: {
  providerTitle: string
  loginUrl: string
}) {
  const { t } = useI18n()
  return (
    <SourceActionState
      label={t("logIn")}
      onClick={() => window.open(loginUrl, "_blank")}
      title={t("logInTo", { provider: providerTitle })}
    />
  )
}

export function SourceErrorState({
  onRefresh,
}: {
  onRefresh: () => void
}) {
  const { t } = useI18n()
  return (
    <SourceActionState
      label={t("refresh")}
      onClick={onRefresh}
      title={t("refreshSource")}
    />
  )
}

export function SourcePermissionState({
  onRequestPermission,
}: {
  onRequestPermission: () => Promise<boolean>
}) {
  const { t } = useI18n()
  return (
    <SourceActionState
      label={t("authorize")}
      onClick={() => void onRequestPermission()}
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
