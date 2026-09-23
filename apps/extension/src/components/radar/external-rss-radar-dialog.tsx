import type { ResolvedRadarSuggestion } from "@/lib/radar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import { useOverlayScrollbars } from "@newsnext/ui/hooks/use-overlay-scrollbars"
import { useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { ScrollProgressProvider } from "@/components/common/scroll-progress-provider"
import { RadarDeck } from "@/components/popup/radar-deck"
import { useI18n } from "@/hooks/use-i18n"
import { consumeExternalRssRadarOpenRequest } from "@/lib/radar"
import { loadSourceDescriptor } from "@/lib/source/registry"

const RSS_SOURCE_ID = "rss:feed"

async function animateCardToBoard(cardId: string, sourceElement: HTMLElement | null): Promise<void> {
  if (!sourceElement || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

  const sourceRect = sourceElement.getBoundingClientRect()
  const clone = sourceElement.cloneNode(true) as HTMLElement
  Object.assign(clone.style, {
    position: "fixed",
    left: `${sourceRect.left}px`,
    top: `${sourceRect.top}px`,
    width: `${sourceRect.width}px`,
    height: `${sourceRect.height}px`,
    margin: "0",
    opacity: "1",
    pointerEvents: "none",
    transform: "none",
    transformOrigin: "top left",
    zIndex: "100",
  })
  document.body.append(clone)

  try {
    const selector = `[data-live-card-id="${CSS.escape(cardId)}"]`
    const deadline = performance.now() + 1500
    let target: HTMLElement | null = null
    while (!target && performance.now() < deadline) {
      target = document.querySelector<HTMLElement>(selector)
      if (!target) await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    }
    if (!target) return

    target.scrollIntoView({ block: "center", behavior: "instant" })
    const targetRect = target.getBoundingClientRect()
    const previousVisibility = target.style.visibility
    target.style.visibility = "hidden"
    try {
      await clone.animate([
        { transform: "translate(0px, 0px) scale(1, 1)" },
        {
          transform: `translate(${targetRect.left - sourceRect.left}px, ${targetRect.top - sourceRect.top}px) scale(${targetRect.width / sourceRect.width}, ${targetRect.height / sourceRect.height})`,
        },
      ], { duration: 750, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }).finished
    } finally {
      target.style.visibility = previousVisibility
    }
  } finally {
    clone.remove()
  }
}

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
  const { t } = useI18n()
  const navigate = useNavigate()
  const [state, setState] = useState<ExternalRssRadarState | null>(readInitialState)
  const [isCelebrating, setIsCelebrating] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null)
  const loadingFeedUrl = state?.status === "loading" ? state.feedUrl : null

  const handleScrollContainerRef = useCallback((container: HTMLDivElement | null) => {
    scrollContainerRef.current = container
    setScrollContainer(container)
  }, [])
  const overlayScrollRef = useOverlayScrollbars(handleScrollContainerRef)

  const close = useCallback(() => {
    setState(null)
  }, [])

  const handleBoardChange = useCallback((boardId: string) => {
    void navigate({ to: "/board/$boardId", params: { boardId }, search: { layer: "now" } })
  }, [navigate])

  const handleCreationStart = useCallback(async (cardId: string, sourceElement: HTMLElement | null) => {
    setIsCelebrating(true)
    try {
      await animateCardToBoard(cardId, sourceElement)
    } catch (error) {
      console.error("Failed to animate the new LiveCard", error)
    }
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
              : t("prepareRssFeedFailed"),
          })
        }
      })

    return () => {
      isCancelled = true
    }
  }, [loadingFeedUrl, t])

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
          ref={overlayScrollRef}
          variant="bare"
          radius={0}
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-100"
          overlayClassName={isCelebrating ? "pointer-events-none opacity-0" : undefined}
          surfaceClassName={isCelebrating ? "min-h-0 overflow-visible opacity-0" : "min-h-0 overflow-visible"}
        >
          <DialogTitle className="sr-only">{t("radarTitle")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("radarRssDescription")}
          </DialogDescription>
          {state.status === "loading" && (
            <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
              {t("preparingRssFeed")}
            </div>
          )}
          {state.status === "error" && (
            <div className="flex min-h-40 flex-col items-center justify-center gap-1 px-6 text-center">
              <span className="font-medium text-foreground">{t("rssFeedUnavailable")}</span>
              <span className="text-xs text-muted-foreground">{state.message}</span>
            </div>
          )}
          {state.status === "ready" && (
            <RadarDeck
              suggestions={[state.suggestion]}
              onCreationStart={handleCreationStart}
              onBoardChange={handleBoardChange}
              onCreated={close}
              layout="dialog"
            />
          )}
        </DialogContent>
      </Dialog>
    </ScrollProgressProvider>
  )
}
