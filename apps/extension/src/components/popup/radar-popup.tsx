import { Button } from "@newsnext/ui/components/button"
import { ThemeIcon } from "@newsnext/ui/components/theme-icon"
import { useOverlayScrollbars } from "@newsnext/ui/hooks/use-overlay-scrollbars"
import { cn } from "@newsnext/ui/lib/utils"
import { useCallback, useRef, useState } from "react"
import { ScrollProgressProvider } from "@/components/common/scroll-progress-provider"
import { PhGear, PhHouse } from "@/components/icons/ph"
import { RadarDeck } from "@/components/popup/radar-deck"
import { useCurrentTabRadarSuggestions } from "@/hooks/use-current-tab-radar-suggestions"
import { useI18n } from "@/hooks/use-i18n"
import { openAppTab } from "@/lib/app-tab"
import { openSettings } from "@/lib/settings"

interface RadarPopupHeaderProps {
  isScanning: boolean
}

function RadarPopupHeader({ isScanning }: RadarPopupHeaderProps): React.JSX.Element {
  const { t } = useI18n()
  const statusLabel = isScanning
    ? t("radarScanning")
    : t("radarTitle")

  return (
    <div className="relative z-20 flex h-8 shrink-0 items-center justify-between gap-2 px-5">
      <div className="flex min-w-0 items-center gap-2 text-base font-bold text-muted-foreground" role="status">
        <ThemeIcon className="size-5 shrink-0" color="red" />
        <span className="truncate">{statusLabel}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="transparent"
          size="icon-sm"
          onClick={() => void openAppTab()}
          aria-label={t("openNewsNext")}
          title={t("openNewsNext")}
          className="island-pill text-primary"
        >
          <PhHouse className="size-5" />
        </Button>
        <Button
          variant="transparent"
          size="icon-sm"
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
  const overlayScrollRef = useOverlayScrollbars(handleScrollContainerRef)
  const suggestions = useCurrentTabRadarSuggestions()
  const hasSuggestions = (suggestions?.length ?? 0) > 0

  return (
    <ScrollProgressProvider
      rootScrollContainer={scrollContainer}
      rootScrollContainerRef={scrollContainerRef}
    >
      <main
        ref={overlayScrollRef}
        data-expanded={hasSuggestions}
        className={cn(
          "grid-texture-background relative flex min-h-0 flex-col gap-2 overflow-y-auto bg-background p-2 text-foreground zenith-theme-400",
          hasSuggestions ? "h-full" : "h-16",
        )}
      >
        <RadarPopupHeader isScanning={suggestions === null} />
        <RadarDeck suggestions={suggestions ?? []} />
      </main>
    </ScrollProgressProvider>
  )
}
