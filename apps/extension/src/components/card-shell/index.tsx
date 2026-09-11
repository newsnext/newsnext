import type { ReactNode } from "react"
import { cn } from "@newsnext/ui/lib/utils"
import { CardContentBackground } from "@/components/card-shell/card-refresh"
import { CardSurface } from "@/components/card-shell/card-surface"

export function CardShell({ header, children, className }: { header: ReactNode, children: ReactNode, className?: string }): React.JSX.Element {
  return (
    <div className={cn("relative h-full min-h-0 **:scrollbar-hidden", className)}>
      <CardSurface className="transition-colors duration-300" />
      <div className="relative flex h-full min-h-0 flex-col p-2.5 transition-colors duration-300">
        {header}
        {children}
      </div>
    </div>
  )
}

export function CardBackContent({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <CardContentBackground />
      <div
        tabIndex={0}
        onPointerDown={event => event.stopPropagation()}
        className="relative size-full overflow-auto rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <div className="space-y-4 p-3">{children}</div>
      </div>
    </div>
  )
}
