import type { MotionValue, PanInfo } from "motion/react"
import type { PointerEvent } from "react"
import type { RadarContext, RadarSuggestion } from "@/lib/radar"
import type { SourceInstanceMeta } from "@/lib/source-cards"
import type { BoardSource } from "@/typings/source"
import { ButtonPrimitive } from "@newsnext/ui/components/button"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useSetAtom } from "jotai"
import { motion, useDragControls, useMotionValue, useTransform } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { browser } from "#imports"
import Card from "@/components/card"
import { IconButton } from "@/components/common/button"
import { PhArrowCircleLeftDuotone, PhForkDuotone, PhLinkDuotone, PhStarFill } from "@/components/icons/ph"
import { getClientSourceDescriptors } from "@/lib/client-sources"
import { getRadarSuggestions } from "@/lib/radar"
import { createForkedInstance } from "@/lib/source-cards"
import { cn } from "@/lib/utils"
import {
  starInstanceAtom,
  upsertInstanceAtom,
} from "@/store/board"

const CLIENT_SOURCES = getClientSourceDescriptors()
const RADAR_SWIPE_THRESHOLD = 90
const RADAR_SWIPE_VELOCITY_THRESHOLD = 500
const RADAR_CARD_GAP = 8
const RADAR_DECK_SPRING = { type: "spring", stiffness: 300, damping: 30 } as const

interface RadarDraftPatch {
  paramsPatch?: Record<string, unknown>
  metaPatch?: SourceInstanceMeta
}

function createRadarBoardSource(suggestion: RadarSuggestion, draftPatch?: RadarDraftPatch): BoardSource | null {
  const descriptor = CLIENT_SOURCES.find(source => source.id === suggestion.sourceId)
  if (!descriptor) {
    return null
  }
  const metaPatch = draftPatch?.metaPatch ?? {}

  return {
    ...descriptor,
    ...metaPatch,
    id: `tmp:radar:${suggestion.id}`,
    sourceId: suggestion.sourceId,
    title: metaPatch.title ?? suggestion.title,
    paramsValue: draftPatch?.paramsPatch ?? suggestion.params,
    isCustom: true,
    origin: "fork",
    isLocalOnly: true,
  }
}

interface RadarSourceCardProps {
  source: BoardSource
  className?: string
  onDraftSourceChange?: (patch: RadarDraftPatch) => void
}

function RadarSourceCard({ source, className, onDraftSourceChange }: RadarSourceCardProps) {
  return (
    <Card
      id={source.id}
      source={source}
      className={cn(
        "overflow-hidden rounded-3xl bg-background shadow-sm ring-1 ring-border/40",
        className,
      )}
      sizeClassName="h-[30rem] w-full"
      showStar={false}
      isDraft
      onDraftSourceChange={onDraftSourceChange}
    />
  )
}

interface RadarTrackCardProps {
  index: number
  source: BoardSource
  trackItemOffset: number
  x: MotionValue<number>
  onDragHandlePointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onDraftSourceChange?: (patch: RadarDraftPatch) => void
}

const RADAR_CARD_ROTATE_OUTPUT = [-7, 0, 7]
const RADAR_CARD_Y_OUTPUT = [20, 0, 20]

function RadarTrackCard({
  index,
  source,
  trackItemOffset,
  x,
  onDragHandlePointerDown,
  onDraftSourceChange,
}: RadarTrackCardProps) {
  const range = [
    -(index + 1) * trackItemOffset,
    -index * trackItemOffset,
    -(index - 1) * trackItemOffset,
  ]
  const rotate = useTransform(x, range, RADAR_CARD_ROTATE_OUTPUT, { clamp: false })
  const y = useTransform(x, range, RADAR_CARD_Y_OUTPUT, { clamp: false })

  return (
    <motion.div
      className="relative h-[30rem] w-full shrink-0 origin-bottom"
      style={{ rotate, y }}
    >
      <div
        className="h-full w-full"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onDragHandlePointerDown}
      >
        <RadarSourceCard
          source={source}
          onDraftSourceChange={onDraftSourceChange}
        />
      </div>
    </motion.div>
  )
}

function useCurrentTabRadarContext(): RadarContext | null {
  const [context, setContext] = useState<RadarContext | null>(null)

  useEffect(() => {
    let isMounted = true

    async function updateFromActiveTab(): Promise<void> {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
      if (!isMounted) {
        return
      }

      setContext(tab?.url
        ? {
            url: tab.url,
            title: tab.title,
          }
        : null)
    }

    const handleTabActivated = () => {
      void updateFromActiveTab()
    }

    const handleTabUpdated = (_tabId: number, changeInfo: browser.tabs.TabChangeInfo, tab: browser.tabs.Tab) => {
      if (!tab.active || (!changeInfo.url && !changeInfo.title)) {
        return
      }

      setContext(tab.url
        ? {
            url: tab.url,
            title: tab.title,
          }
        : null)
    }

    void updateFromActiveTab()
    browser.tabs.onActivated.addListener(handleTabActivated)
    browser.tabs.onUpdated.addListener(handleTabUpdated)

    return () => {
      isMounted = false
      browser.tabs.onActivated.removeListener(handleTabActivated)
      browser.tabs.onUpdated.removeListener(handleTabUpdated)
    }
  }, [])

  return context
}

function RadarEmptyState() {
  return (
    <div className="relative flex min-h-36 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-background/70 px-5 text-center text-sm text-muted-foreground">
      <SquircleBox
        aria-hidden
        radius="2xl"
        className="pointer-events-none absolute inset-0 bg-muted/40"
      />
      <span className="relative">No radar cards for this page.</span>
    </div>
  )
}

interface RadarDeckProps {
  suggestions: RadarSuggestion[]
}

function RadarDeck({ suggestions }: RadarDeckProps) {
  const upsertLocal = useSetAtom(upsertInstanceAtom)
  const starLocal = useSetAtom(starInstanceAtom)
  const [activeIndex, setActiveIndex] = useState(0)
  const [draftPatches, setDraftPatches] = useState<Record<string, RadarDraftPatch>>({})
  const [trackItemOffset, setTrackItemOffset] = useState(1)
  const deckRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()
  const x = useMotionValue(0)

  useEffect(() => {
    setActiveIndex(0)
    x.set(0)
  }, [suggestions, x])

  useEffect(() => {
    const deck = deckRef.current
    if (!deck) {
      return
    }

    const updateTrackItemOffset = () => {
      setTrackItemOffset(Math.max(deck.clientWidth + RADAR_CARD_GAP, 1))
    }

    updateTrackItemOffset()
    const resizeObserver = new ResizeObserver(updateTrackItemOffset)
    resizeObserver.observe(deck)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const activeSuggestion = suggestions[activeIndex]
  const activeSource = activeSuggestion ? createRadarBoardSource(activeSuggestion, draftPatches[activeSuggestion.id]) : null
  const canGoPrevious = activeIndex > 0
  const canGoNext = activeIndex < suggestions.length - 1
  const radarSources = useMemo(() => {
    return suggestions.map(suggestion => ({
      suggestion,
      source: createRadarBoardSource(suggestion, draftPatches[suggestion.id]),
    }))
  }, [draftPatches, suggestions])

  const moveDeck = useCallback((direction: number) => {
    setActiveIndex(prev => Math.min(Math.max(prev + direction, 0), suggestions.length - 1))
  }, [suggestions.length])

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldMovePrevious = info.offset.x > RADAR_SWIPE_THRESHOLD || info.velocity.x > RADAR_SWIPE_VELOCITY_THRESHOLD
    const shouldMoveNext = info.offset.x < -RADAR_SWIPE_THRESHOLD || info.velocity.x < -RADAR_SWIPE_VELOCITY_THRESHOLD

    if (shouldMovePrevious && canGoPrevious) {
      moveDeck(-1)
      return
    }

    if (shouldMoveNext && canGoNext) {
      moveDeck(1)
    }
  }, [canGoNext, canGoPrevious, moveDeck])

  const handleDragHandlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    dragControls.start(event)
  }, [dragControls])

  const dragConstraints = useMemo(() => ({
    left: -trackItemOffset * Math.max(suggestions.length - 1, 0),
    right: 0,
  }), [suggestions.length, trackItemOffset])

  const trackStyle = useMemo(() => ({
    gap: `${RADAR_CARD_GAP}px`,
    x,
    touchAction: "pan-y" as const,
  }), [x])

  const trackAnimate = useMemo(() => ({
    x: -(activeIndex * trackItemOffset),
  }), [activeIndex, trackItemOffset])

  const createActiveForkInstance = useCallback(() => {
    if (!activeSuggestion || !activeSource) {
      return null
    }

    return createForkedInstance(
      activeSource.sourceId,
      activeSource.paramsValue ?? {},
      {
        providerTitle: activeSource.providerTitle,
        title: activeSource.title,
        desc: activeSource.desc,
        home: activeSource.home,
        color: activeSource.color,
      },
      { type: "radar", ruleId: activeSuggestion.ruleId },
    )
  }, [activeSource, activeSuggestion])

  const handleFork = useCallback(() => {
    const instance = createActiveForkInstance()
    if (!instance) {
      return
    }

    upsertLocal(instance)
  }, [createActiveForkInstance, upsertLocal])

  const handleForkAndStar = useCallback(() => {
    const instance = createActiveForkInstance()
    if (!instance) {
      return
    }

    upsertLocal(instance)
    starLocal({ instanceId: instance.instanceId, starred: true })
  }, [createActiveForkInstance, starLocal, upsertLocal])

  const handleActiveDraftSourceChange = useCallback((patch: RadarDraftPatch) => {
    if (!activeSuggestion) {
      return
    }

    setDraftPatches(prev => ({
      ...prev,
      [activeSuggestion.id]: {
        ...prev[activeSuggestion.id],
        ...patch,
      },
    }))
  }, [activeSuggestion])

  if (!activeSuggestion || !activeSource) {
    return <RadarEmptyState />
  }

  return (
    <section className="space-y-3" aria-label="Radar cards">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <PhLinkDuotone className="text-base" />
          Radar
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            onClick={() => moveDeck(-1)}
            disabled={!canGoPrevious}
            aria-label="Previous radar card"
            title="Previous radar card"
            className={cn("text-xl", !canGoPrevious && "opacity-20")}
          >
            <PhArrowCircleLeftDuotone />
          </IconButton>
          <IconButton
            onClick={() => moveDeck(1)}
            disabled={!canGoNext}
            aria-label="Next radar card"
            title="Next radar card"
            className={cn("rotate-180 text-xl", !canGoNext && "opacity-20")}
          >
            <PhArrowCircleLeftDuotone />
          </IconButton>
        </div>
      </div>

      <div className="flex justify-center overflow-hidden">
        <div ref={deckRef} className="w-full max-w-[25rem] overflow-hidden py-2">
          <motion.div
            className="flex cursor-grab active:cursor-grabbing"
            drag="x"
            dragControls={dragControls}
            dragConstraints={dragConstraints}
            dragElastic={0.4}
            dragListener={false}
            style={trackStyle}
            animate={trackAnimate}
            transition={RADAR_DECK_SPRING}
            onDragEnd={handleDragEnd}
          >
            {radarSources.map(({ suggestion, source }, index) => source && (
              <RadarTrackCard
                key={suggestion.id}
                index={index}
                source={source}
                trackItemOffset={trackItemOffset}
                x={x}
                onDragHandlePointerDown={handleDragHandlePointerDown}
                onDraftSourceChange={index === activeIndex ? handleActiveDraftSourceChange : undefined}
              />
            ))}
          </motion.div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {activeIndex + 1}
          {" / "}
          {suggestions.length}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <ButtonPrimitive
            onClick={handleFork}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            <PhForkDuotone />
            Fork
          </ButtonPrimitive>
          <ButtonPrimitive
            onClick={handleForkAndStar}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            <PhStarFill />
            Fork and Star
          </ButtonPrimitive>
        </div>
      </div>
    </section>
  )
}

export function RadarSidePanel() {
  const radarContext = useCurrentTabRadarContext()
  const suggestions = useMemo(() => {
    return radarContext ? getRadarSuggestions(radarContext, CLIENT_SOURCES) : []
  }, [radarContext])

  return (
    <main className="grid-texture-background h-screen overflow-y-auto bg-background px-3 py-4 text-foreground sunrise-theme-400">
      <div className="mx-auto w-full max-w-[27rem]">
        <RadarDeck suggestions={suggestions} />
      </div>
    </main>
  )
}
