import { Button } from "@newsnext/ui/components/button"
import { ThemeIcon } from "@newsnext/ui/components/theme-icon"
import { useCallback, useRef, useState } from "react"
import { ScrollProgressProvider } from "@/components/common/scroll-progress-provider"
import { PhGear, PhHouse } from "@/components/icons/ph"
import { RadarDeck } from "@/components/popup/radar-deck"
import { useCurrentTabRadarSuggestions } from "@/hooks/use-current-tab-radar-suggestions"
import { useI18n } from "@/hooks/use-i18n"
import { openAppTab } from "@/lib/app-tab"
import { openSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"

interface RadarOverlayHeaderProps {
  count: number
  isScanning: boolean
}

function RadarOverlayHeader({ count, isScanning }: RadarOverlayHeaderProps): React.JSX.Element {
  const { t } = useI18n()
  const statusLabel = isScanning
    ? t("radarScanning")
    : t("radarLiveCards", { count, unit: t(count === 1 ? "liveCard" : "liveCards") })

  return (
    <div className="relative z-20 flex h-10 shrink-0 items-center justify-between gap-3">
      <div
        className="flex h-10 items-center gap-2 px-1 text-lg font-bold text-muted-foreground"
        role="status"
      >
        <ThemeIcon className="size-5 shrink-0" color="red" />
        <span>{statusLabel}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="transparent"
          size="icon-lg"
          onClick={() => void openAppTab()}
          aria-label={t("openNewsNext")}
          title={t("openNewsNext")}
          className="island-pill text-primary"
        >
          <PhHouse className="size-5" />
        </Button>
        <Button
          variant="transparent"
          size="icon-lg"
          onClick={() => void openSettings()}
          aria-label={t("openOptions")}
          title={t("openOptions")}
          className="island-pill text-muted-foreground hover:text-foreground"
        >
          <PhGear className="size-5" />
        </Button>
      </div>
    </div>
  )
}

export function RadarPopup() {
  const scrollContainerRef = useRef<HTMLElement>(null)
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null)
  const handleScrollContainerRef = useCallback((container: HTMLElement | null) => {
    scrollContainerRef.current = container
    setScrollContainer(container)
  }, [])
  const suggestions = useCurrentTabRadarSuggestions()
  const suggestionCount = suggestions?.length ?? 0

  return (
    <ScrollProgressProvider
      rootScrollContainer={scrollContainer}
      rootScrollContainerRef={scrollContainerRef}
    >
      <main
        ref={handleScrollContainerRef}
        className={cn(
          "grid-texture-background relative flex min-h-0 flex-col gap-2 overflow-y-auto bg-background p-3 text-foreground zenith-theme-400",
          suggestionCount > 0 ? "h-[600px]" : "h-16",
        )}
      >
        <RadarOverlayHeader count={suggestionCount} isScanning={suggestions === null} />
        <RadarDeck suggestions={suggestions ?? []} />
      </main>
    </ScrollProgressProvider>
  )
}
