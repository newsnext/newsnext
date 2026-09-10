import { SquircleBox } from "@newsnext/ui/components/squircle"
import { cn } from "@newsnext/ui/lib/utils"
import { CardHeaderActionButton } from "@/components/card-shell/card-header"
import { PhArrowCounterClockwiseDuotone, PhCircleDashedDuotone } from "@/components/icons/ph"
import { useI18n } from "@/hooks/use-i18n"

export function CardRefreshButton({
  isFetching,
  onRefresh,
  label,
}: {
  label?: string
  isFetching: boolean
  onRefresh: () => void
}): React.JSX.Element {
  const { t } = useI18n()
  return (
    <CardHeaderActionButton
      className={isFetching ? "animate-spin" : undefined}
      disabled={isFetching}
      onClick={onRefresh}
      aria-label={label ?? t("refresh")}
    >
      {isFetching ? <PhCircleDashedDuotone /> : <PhArrowCounterClockwiseDuotone />}
    </CardHeaderActionButton>
  )
}

export function CardContentBackground({ isFetching = false }: { isFetching?: boolean }): React.JSX.Element {
  return <SquircleBox aria-hidden radius="2xl" className={cn("pointer-events-none absolute inset-0 bg-background/70 zenith-theme-400", isFetching && "animate-pulse")} />
}

export function CardContentTransition({ isFetching, children, className }: {
  isFetching: boolean
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return <div aria-busy={isFetching} className={cn("min-h-full transition-opacity duration-500", isFetching && "opacity-20", className)}>{children}</div>
}
