import type { ComponentProps } from "react"
import { cn } from "@newsnext/ui/lib/utils"

interface SettingsSectionProps extends ComponentProps<"section"> {
  description?: string
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
    <section className={cn("space-y-2.5", className)} {...props}>
      <div className="space-y-0.5 px-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}
