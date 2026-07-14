import { useMemo } from "react"
import { RadarDeck } from "@/components/popup/radar-deck"
import { useCurrentTabRadarContext } from "@/hooks/use-current-tab-radar-context"
import { getClientSourceDescriptors } from "@/lib/client-sources"
import { createRadarMatcher } from "@/lib/radar"

const CLIENT_SOURCES = getClientSourceDescriptors()
const RADAR_MATCHER = createRadarMatcher(CLIENT_SOURCES)

export function RadarPopup() {
  const radarContext = useCurrentTabRadarContext()
  const suggestions = useMemo(() => {
    return radarContext ? RADAR_MATCHER.getSuggestions(radarContext) : []
  }, [radarContext])

  return (
    <main className="grid-texture-background h-full min-h-0 overflow-y-auto bg-background px-3 py-4 text-foreground sunrise-theme-400">
      <div className="mx-auto w-full max-w-108">
        <RadarDeck sourceDescriptors={CLIENT_SOURCES} suggestions={suggestions} />
      </div>
    </main>
  )
}
