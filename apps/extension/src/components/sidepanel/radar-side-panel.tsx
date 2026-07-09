import { useMemo } from "react"
import { RadarDeck } from "@/components/sidepanel/radar-deck"
import { useCurrentTabRadarContext } from "@/hooks/use-current-tab-radar-context"
import { getClientSourceDescriptors } from "@/lib/client-sources"
import { createRadarMatcher } from "@/lib/radar"

const CLIENT_SOURCES = getClientSourceDescriptors()
const RADAR_MATCHER = createRadarMatcher(CLIENT_SOURCES)

export function RadarSidePanel() {
  const radarContext = useCurrentTabRadarContext()
  const suggestions = useMemo(() => {
    return radarContext ? RADAR_MATCHER.getSuggestions(radarContext) : []
  }, [radarContext])

  return (
    <main className="grid-texture-background h-screen overflow-y-auto bg-background px-3 py-4 text-foreground sunrise-theme-400">
      <div className="mx-auto w-full max-w-[27rem]">
        <RadarDeck sourceDescriptors={CLIENT_SOURCES} suggestions={suggestions} />
      </div>
    </main>
  )
}
