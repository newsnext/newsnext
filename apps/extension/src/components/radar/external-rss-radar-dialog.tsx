import type { ResolvedRadarSuggestion } from "@/lib/radar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import { useCallback, useEffect, useRef, useState } from "react"
import { ScrollProgressProvider } from "@/components/common/scroll-progress-provider"
import { RadarDeck } from "@/components/popup/radar-deck"
import { consumeExternalRssRadarOpenRequest } from "@/lib/radar"
import { loadSourceDescriptor } from "@/lib/source/registry"

const RSS_SOURCE_ID = "rss:feed"

type ExternalRssRadarState
  = | { feedUrl: string, status: "loading" }
    | { message: string, status: "error" }
    | { status: "ready", suggestion: ResolvedRadarSuggestion }

function readInitialState(): ExternalRssRadarState | null {
  const intent = consumeExternalRssRadarOpenRequest()
  if (!intent) return null
  return "feedUrl" in intent
    ? { status: "loading", feedUrl: intent.feedUrl }
    : { status: "error", message: intent.message }
}

export function ExternalRssRadarDialog(): React.JSX.Element | null {
  const [state, setState] = useState<ExternalRssRadarState | null>(readInitialState)
  const [isCelebrating, setIsCelebrating] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null)
  const loadingFeedUrl = state?.status === "loading" ? state.feedUrl : null

  const handleScrollContainerRef = useCallback((container: HTMLDivElement | null) => {
    scrollContainerRef.current = container
    setScrollContainer(container)
  }, [])

  const close = useCallback(() => {
    setState(null)
  }, [])

  const beginCelebration = useCallback(() => {
    setIsCelebrating(true)
  }, [])

  useEffect(() => {
    if (!loadingFeedUrl) return

    let isCancelled = false
    void loadSourceDescriptor(RSS_SOURCE_ID)
      .then((source) => {
        if (!isCancelled) {
          setState({
            status: "ready",
            suggestion: {
              id: `external-rss:${loadingFeedUrl}`,
              ruleId: "external-rss",
              sourceId: RSS_SOURCE_ID,
              patch: { params: { url: loadingFeedUrl } },
              source,
            },
          })
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          setState({
            status: "error",
            message: error instanceof Error
              ? error.message
              : "NewsNext could not prepare this RSS feed.",
          })
        }
      })

    return () => {
      isCancelled = true
    }
  }, [loadingFeedUrl])

  if (!state) return null

  return (
    <ScrollProgressProvider
      rootScrollContainer={scrollContainer}
      rootScrollContainerRef={scrollContainerRef}
    >
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) close()
        }}
      >
        <DialogContent
          ref={handleScrollContainerRef}
          variant="bare"
          radius={0}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-100"
          overlayClassName={isCelebrating ? "pointer-events-none opacity-0" : undefined}
          surfaceClassName="min-h-0 overflow-visible"
        >
          <DialogTitle className="sr-only">Radar</DialogTitle>
          <DialogDescription className="sr-only">
            Review the RSS feed and create a LiveCard.
          </DialogDescription>
          {state.status === "loading" && (
            <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
              Preparing RSS feed…
            </div>
          )}
          {state.status === "error" && (
            <div className="flex min-h-40 flex-col items-center justify-center gap-1 px-6 text-center">
              <span className="font-medium text-foreground">RSS feed unavailable</span>
              <span className="text-xs text-muted-foreground">{state.message}</span>
            </div>
          )}
          {state.status === "ready" && (
            <RadarDeck
              suggestions={[state.suggestion]}
              onCreationStart={beginCelebration}
              onCreated={close}
              layout="dialog"
            />
          )}
        </DialogContent>
      </Dialog>
    </ScrollProgressProvider>
  )
}
