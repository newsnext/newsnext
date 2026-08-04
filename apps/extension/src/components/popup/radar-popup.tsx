import { useMemo, useRef } from "react"
import { ScrollProgressProvider } from "@/components/common/scroll-progress-provider"
import { RadarDeck } from "@/components/popup/radar-deck"
import { useCurrentTabRadarContext } from "@/hooks/use-current-tab-radar-context"
import { useSourceDescriptors } from "@/hooks/use-source-descriptors"
import { createRadarMatcher } from "@/lib/radar"

export function RadarPopup() {
  const scrollContainerRef = useRef<HTMLElement>(null)
  const nextLayerScrollContainerRef = useRef<HTMLDivElement>(null)
  const { sources } = useSourceDescriptors()
  const radarMatcher = useMemo(() => createRadarMatcher(sources), [sources])
  const radarContext = useCurrentTabRadarContext(radarMatcher)
  const suggestions = useMemo(() => {
    return radarContext ? radarMatcher.getSuggestions(radarContext) : []
  }, [radarContext, radarMatcher])

  return (
    <ScrollProgressProvider
      rootScrollContainerRef={scrollContainerRef}
      nextLayerScrollContainerRef={nextLayerScrollContainerRef}
    >
      <main
        ref={scrollContainerRef}
        className="grid-texture-background h-full min-h-0 overflow-y-auto bg-background p-3 text-foreground zenith-theme-400"
      >
        <RadarDeck sourceDescriptors={sources} suggestions={suggestions} />
      </main>
    </ScrollProgressProvider>
  )
}
