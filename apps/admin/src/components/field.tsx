import type { ReactNode } from "react"
import { Label } from "@newsnext/ui/components/label"
import { cn } from "@newsnext/ui/lib/utils"

export function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
