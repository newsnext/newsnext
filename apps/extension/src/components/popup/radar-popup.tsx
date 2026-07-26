import { useMemo } from "react"
import { RadarDeck } from "@/components/popup/radar-deck"
import { useCurrentTabRadarContext } from "@/hooks/use-current-tab-radar-context"
import { useSourceDescriptors } from "@/hooks/use-source-descriptors"
import { createRadarMatcher } from "@/lib/radar"

export function RadarPopup() {
  const radarContext = useCurrentTabRadarContext()
  const { sources } = useSourceDescriptors()
  const radarMatcher = useMemo(() => createRadarMatcher(sources), [sources])
  const suggestions = useMemo(() => {
    return radarContext ? radarMatcher.getSuggestions(radarContext) : []
  }, [radarContext, radarMatcher])

  return (
    <main className="grid-texture-background h-full min-h-0 overflow-y-auto bg-background p-3 text-foreground sunrise-theme-400">
      <div className="mx-auto w-full max-w-108">
        <RadarDeck sourceDescriptors={sources} suggestions={suggestions} />
      </div>
    </main>
  )
}
