import type { ComponentProps, ReactNode } from "react"
import { Button } from "@newsnext/ui/components/button"
import { useEffect, useState } from "react"
import { PhCheckCircle } from "@/components/icons/ph"
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
  const [isArmed, setIsArmed] = useState(false)
  const isExpandingIcon = appearance === "icon-expand"
  const currentLabel = pending && isArmed
    ? pendingLabel ?? confirmLabel
    : isArmed ? confirmLabel : label
  const accessibleLabel: string | undefined = isExpandingIcon
    ? pending && isArmed
      ? typeof currentLabel === "string" ? currentLabel : undefined
      : isArmed ? `Confirm ${label}` : typeof label === "string" ? label : undefined
    : undefined

  useEffect(() => {
    if (!isArmed || pending || resetAfterMs === undefined) return

    const timeoutId = window.setTimeout(setIsArmed, resetAfterMs, false)
    return () => window.clearTimeout(timeoutId)
  }, [isArmed, pending, resetAfterMs])

  return (
    <Button
      {...props}
      variant={isArmed ? "destructive" : isExpandingIcon ? "transparent" : "outline"}
      className={cn(
        "transition-[opacity,color,background-color,border-color] duration-300 ease-out motion-reduce:transition-none",
        className,
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
