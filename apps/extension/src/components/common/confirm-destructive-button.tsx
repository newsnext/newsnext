import type { ComponentProps, ReactNode } from "react"
import { Button } from "@newsnext/ui/components/button"
import { useEffect, useState } from "react"
import { PhCheckCircle } from "@/components/icons/ph"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"

interface BaseConfirmDestructiveButtonProps extends Omit<
  ComponentProps<typeof Button>,
  "children" | "onBlur" | "onClick" | "variant"
> {
  confirmLabel: ReactNode
  label: ReactNode
  onArm?: () => void
  onConfirm: () => Promise<void> | void
  pending?: boolean
  pendingLabel?: ReactNode
}

interface TextConfirmDestructiveButtonProps extends BaseConfirmDestructiveButtonProps {
  appearance?: "text"
  icon?: never
  resetAfterMs?: never
}

interface ExpandingIconConfirmDestructiveButtonProps extends BaseConfirmDestructiveButtonProps {
  appearance: "icon-expand"
  icon: ReactNode
  label: string
  resetAfterMs?: number
}

type ConfirmDestructiveButtonProps
  = | ExpandingIconConfirmDestructiveButtonProps
    | TextConfirmDestructiveButtonProps

export function ConfirmDestructiveButton({
  appearance = "text",
  className,
  confirmLabel,
  icon,
  label,
  onArm,
  onConfirm,
  pending = false,
  pendingLabel,
  resetAfterMs,
  ...props
}: ConfirmDestructiveButtonProps): React.JSX.Element {
  const { t } = useI18n()
  const [isArmed, setIsArmed] = useState(false)
  const isExpandingIcon = appearance === "icon-expand"
  const currentLabel = pending && isArmed
    ? pendingLabel ?? confirmLabel
    : isArmed ? confirmLabel : label
  const accessibleLabel: string | undefined = isExpandingIcon
    ? pending && isArmed
      ? typeof currentLabel === "string" ? currentLabel : undefined
      : isArmed
        ? typeof label === "string" ? t("confirmAction", { label }) : undefined
        : typeof label === "string" ? label : undefined
    : undefined

  useEffect(() => {
    if (!isArmed || pending || resetAfterMs === undefined) return

    const timeoutId = window.setTimeout(setIsArmed, resetAfterMs, false)
    return () => window.clearTimeout(timeoutId)
  }, [isArmed, pending, resetAfterMs])

  return (
    <Button
      {...props}
      variant={isArmed || !isExpandingIcon ? "outline" : "transparent"}
      className={cn(
        "transition-[opacity,color,background-color,border-color] duration-300 ease-out motion-reduce:transition-none",
        className,
        isArmed && "border-destructive/40 bg-destructive/10 text-destructive enabled:hover:border-destructive/50 enabled:hover:bg-destructive/20 enabled:hover:text-destructive focus-visible:border-destructive/50 focus-visible:ring-destructive/20 dark:border-destructive/50 dark:bg-destructive/20 dark:enabled:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
      )}
      data-confirmation={isArmed ? "armed" : "idle"}
      disabled={props.disabled || pending}
      aria-label={props["aria-label"] ?? accessibleLabel}
      title={props.title ?? accessibleLabel}
      onBlur={() => {
        if (!pending) setIsArmed(false)
      }}
      onClick={() => {
        if (!isArmed) {
          onArm?.()
          setIsArmed(true)
          return
        }
        void onConfirm()
      }}
    >
      {isArmed ? <PhCheckCircle /> : isExpandingIcon ? icon : null}
      {isExpandingIcon
        ? (
            <>
              <span
                aria-hidden
                className={cn(
                  "overflow-hidden transition-[max-width,opacity] duration-150 ease-out motion-reduce:transition-none",
                  isArmed ? "max-w-12 opacity-100" : "max-w-0 opacity-0",
                )}
              >
                {currentLabel}
              </span>
              <span className="sr-only" aria-live="polite">{accessibleLabel}</span>
            </>
          )
        : <span aria-live="polite">{currentLabel}</span>}
    </Button>
  )
}
