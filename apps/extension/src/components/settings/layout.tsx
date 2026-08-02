import type { ComponentProps } from "react"
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
