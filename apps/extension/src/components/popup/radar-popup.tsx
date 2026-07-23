import { useMemo } from "react"
import { RadarDeck } from "@/components/popup/radar-deck"
import { useCurrentTabRadarContext } from "@/hooks/use-current-tab-radar-context"
import { createRadarMatcher } from "@/lib/radar"
import { getSourceDescriptors } from "@/lib/sources"

const SOURCES = getSourceDescriptors()
const RADAR_MATCHER = createRadarMatcher(SOURCES)

export function RadarPopup() {
  const radarContext = useCurrentTabRadarContext()
  const suggestions = useMemo(() => {
    return radarContext ? RADAR_MATCHER.getSuggestions(radarContext) : []
  }, [radarContext])

  return (
    <main className="grid-texture-background h-full min-h-0 overflow-y-auto bg-background p-3 text-foreground sunrise-theme-400">
      <div className="mx-auto w-full max-w-108">
        <RadarDeck sourceDescriptors={SOURCES} suggestions={suggestions} />
      </div>
    </main>
  )
}
