import { Button } from "@newsnext/ui/components/button"
import { useRef } from "react"
import { ScrollProgressProvider } from "@/components/common/scroll-progress-provider"
import { PhGear, PhHouse } from "@/components/icons/ph"
import { RadarDeck } from "@/components/popup/radar-deck"
import { useCurrentTabRadarSuggestions } from "@/hooks/use-current-tab-radar-suggestions"
import { useSourceDescriptors } from "@/hooks/use-source-descriptors"
import { openAppTab } from "@/lib/app-tab"
import { openSettings } from "@/lib/settings"

function RadarOverlayActions(): React.JSX.Element {
  return (
    <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
      <Button
        variant="transparent"
        size="icon-lg"
        onClick={() => void openAppTab()}
        aria-label="Open NewsNext"
        title="Open NewsNext"
        className="island-pill text-primary"
      >
        <PhHouse className="size-5" />
      </Button>
      <Button
        variant="transparent"
        size="icon-lg"
        onClick={() => void openSettings()}
        aria-label="Open options"
        title="Open options"
        className="island-pill text-muted-foreground hover:text-foreground"
      >
        <PhGear className="size-5" />
      </Button>
    </div>
  )
}

export function RadarPopup() {
  const scrollContainerRef = useRef<HTMLElement>(null)
  const nextLayerScrollContainerRef = useRef<HTMLDivElement>(null)
  const { sources } = useSourceDescriptors()
  const suggestions = useCurrentTabRadarSuggestions()

  return (
    <ScrollProgressProvider
      rootScrollContainerRef={scrollContainerRef}
      nextLayerScrollContainerRef={nextLayerScrollContainerRef}
    >
      <main
        ref={scrollContainerRef}
        className="grid-texture-background relative h-full min-h-0 overflow-y-auto bg-background p-3 text-foreground zenith-theme-400"
      >
        <RadarOverlayActions />
        <RadarDeck sourceDescriptors={sources} suggestions={suggestions ?? []} />
      </main>
    </ScrollProgressProvider>
  )
}
