import type { ComponentProps, ReactNode } from "react"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { cn } from "@newsnext/ui/lib/utils"

interface SettingsSectionProps extends ComponentProps<"section"> {
  description: string
  title: string
}

export function SettingsSection({
  children,
  className,
  description,
  title,
  ...props
}: SettingsSectionProps): React.JSX.Element {
  return (
    <section className={cn("space-y-3", className)} {...props}>
      <div className="space-y-1 px-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

export function SettingsPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div className="relative isolate">
      <SquircleBox
        aria-hidden
        radius="2xl"
        className="pointer-events-none absolute inset-0 bg-foreground/3 ring-1 ring-foreground/5"
      />
      <div className={cn("relative p-4", className)}>{children}</div>
    </div>
  )
}
