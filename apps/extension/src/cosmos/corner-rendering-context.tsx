/* eslint-disable react-refresh/only-export-components */
import type { SquircleRendering } from "@newsnext/ui/hooks/use-squircle"
import type { PropsWithChildren } from "react"
import { createContext, use, useState } from "react"

interface CornerRenderingContextValue {
  rendering: SquircleRendering
  setRendering: (rendering: SquircleRendering) => void
}

const CornerRenderingContext = createContext<CornerRenderingContextValue | null>(null)

function CornerRenderingProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [rendering, setRendering] = useState<SquircleRendering>("corner-shape")

  return (
    <CornerRenderingContext value={{ rendering, setRendering }}>
      {children}
    </CornerRenderingContext>
  )
}

function useCornerRendering(): CornerRenderingContextValue {
  const context = use(CornerRenderingContext)
  if (!context) throw new Error("useCornerRendering must be used within CornerRenderingProvider")
  return context
}

export { CornerRenderingProvider, useCornerRendering }
