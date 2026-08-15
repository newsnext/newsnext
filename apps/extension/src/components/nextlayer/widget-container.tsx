import type { ReactNode } from "react"
import { m } from "motion/react"

interface WidgetContainerProps {
  children: ReactNode
}

export function WidgetContainer({ children }: WidgetContainerProps) {
  return (
    <m.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.12, duration: 0.25, ease: "easeOut" }}
      className="mx-auto min-h-full w-full max-w-3xl px-1 pb-24 pt-28 sm:px-6"
    >
      <h1 className="sr-only">Next Layer</h1>
      {children}
    </m.main>
  )
}
