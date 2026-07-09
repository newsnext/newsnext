import type { MotionValue, PanInfo } from "motion/react"
import type { CSSProperties, PointerEvent } from "react"
import type { RadarSuggestion } from "@/lib/radar"
import type { RadarDraftPatch } from "@/lib/radar-board-source"
import type { BoardSource, SourceDescriptor } from "@/typings/source"
import { ButtonPrimitive } from "@newsnext/ui/components/button"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useSetAtom } from "jotai"
import { animate, motion, useDragControls, useMotionValue, useTransform } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Card from "@/components/card"
import { IconButton } from "@/components/common/button"
import { PhArrowCircleLeftDuotone, PhForkDuotone, PhStarFill } from "@/components/icons/ph"
import { createRadarBoardSource, mergeRadarDraftPatch } from "@/lib/radar-board-source"
import { createForkedInstance } from "@/lib/source-cards"
import { cn } from "@/lib/utils"
import {
  starInstanceAtom,
  upsertInstanceAtom,
} from "@/store/board"

const RADAR_SWIPE_THRESHOLD = 90
const RADAR_SWIPE_VELOCITY_THRESHOLD = 500
const RADAR_CARD_GAP = 8
const RADAR_DECK_SPRING = { type: "spring", stiffness: 300, damping: 30 } as const
const RADAR_CARD_ROTATE_OUTPUT = [-7, 0, 7]
const RADAR_CARD_Y_OUTPUT = [20, 0, 20]

function getRadarTrackX(index: number, trackItemOffset: number): number {
  return -(index * trackItemOffset)
}

interface RadarActionStyle extends CSSProperties {
  "--radar-action-card-bg": string
  "--radar-action-card-bg-hover": string
  "--radar-action-chip-text": string
}

function getRadarActionStyle(color: BoardSource["color"]): RadarActionStyle {
  return {
    "--radar-action-card-bg": `color-mix(in oklab, var(--color-${color}-400) 40%, transparent)`,
    "--radar-action-card-bg-hover": `color-mix(in oklab, var(--color-${color}-400) 52%, transparent)`,
    "--radar-action-chip-text": `var(--color-${color}-400)`,
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
      className="relative h-120 w-full shrink-0 origin-bottom"
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
  sourceDescriptors: SourceDescriptor[]
  suggestions: RadarSuggestion[]
}

export function RadarDeck({ sourceDescriptors, suggestions }: RadarDeckProps) {
  const upsertLocal = useSetAtom(upsertInstanceAtom)
  const starLocal = useSetAtom(starInstanceAtom)
  const [activeIndex, setActiveIndex] = useState(0)
  const [draftPatches, setDraftPatches] = useState<Record<string, RadarDraftPatch>>({})
  const [trackItemOffset, setTrackItemOffset] = useState(1)
  const [hasMeasuredDeck, setHasMeasuredDeck] = useState(false)
  const deckRef = useRef<HTMLDivElement>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const dragControls = useDragControls()
  const x = useMotionValue(0)

  useEffect(() => {
    setActiveIndex(0)
    x.set(0)
  }, [suggestions, x])

  useEffect(() => {
    const targetX = getRadarTrackX(activeIndex, trackItemOffset)
    const controls = animate(x, targetX, RADAR_DECK_SPRING)

    return () => {
      controls.stop()
    }
  }, [activeIndex, trackItemOffset, x])

  const measureDeck = useCallback((deck: HTMLDivElement) => {
    const nextTrackItemOffset = Math.max(deck.clientWidth + RADAR_CARD_GAP, 1)
    setTrackItemOffset(nextTrackItemOffset)
    setHasMeasuredDeck(true)
  }, [])

  const setDeckNode = useCallback((node: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect()
    resizeObserverRef.current = null
    deckRef.current = node

    if (!node) {
      setHasMeasuredDeck(false)
      return
    }

    measureDeck(node)
    const resizeObserver = new ResizeObserver(() => {
      measureDeck(node)
    })
    resizeObserver.observe(node)
    resizeObserverRef.current = resizeObserver
  }, [measureDeck])

  const activeSuggestion = suggestions[activeIndex]
  const activeSource = activeSuggestion
    ? createRadarBoardSource(activeSuggestion, sourceDescriptors, draftPatches[activeSuggestion.id])
    : null
  const canGoPrevious = activeIndex > 0
  const canGoNext = activeIndex < suggestions.length - 1
  const canDragDeck = hasMeasuredDeck && suggestions.length > 0
  const radarSources = useMemo(() => {
    return suggestions.map(suggestion => ({
      suggestion,
      source: createRadarBoardSource(suggestion, sourceDescriptors, draftPatches[suggestion.id]),
    }))
  }, [draftPatches, sourceDescriptors, suggestions])

  const moveDeck = useCallback((direction: number) => {
    setActiveIndex(prev => Math.min(Math.max(prev + direction, 0), suggestions.length - 1))
  }, [suggestions.length])

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldMovePrevious = info.offset.x > RADAR_SWIPE_THRESHOLD || info.velocity.x > RADAR_SWIPE_VELOCITY_THRESHOLD
    const shouldMoveNext = info.offset.x < -RADAR_SWIPE_THRESHOLD || info.velocity.x < -RADAR_SWIPE_VELOCITY_THRESHOLD
    const fallbackTargetX = getRadarTrackX(activeIndex, trackItemOffset)

    if (shouldMovePrevious && canGoPrevious) {
      moveDeck(-1)
      return
    }

    if (shouldMoveNext && canGoNext) {
      moveDeck(1)
      return
    }

    void animate(x, fallbackTargetX, RADAR_DECK_SPRING)
  }, [activeIndex, canGoNext, canGoPrevious, moveDeck, trackItemOffset, x])

  const handleDragHandlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!canDragDeck) {
      return
    }

    dragControls.start(event)
  }, [canDragDeck, dragControls])

  const dragConstraints = useMemo(() => ({
    left: -trackItemOffset * Math.max(suggestions.length - 1, 0),
    right: 0,
  }), [suggestions.length, trackItemOffset])

  const trackStyle = useMemo(() => ({
    gap: `${RADAR_CARD_GAP}px`,
    x,
    touchAction: "pan-y" as const,
  }), [x])

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
      [activeSuggestion.id]: mergeRadarDraftPatch(prev[activeSuggestion.id], patch),
    }))
  }, [activeSuggestion])

  if (!activeSuggestion || !activeSource) {
    return <RadarEmptyState />
  }

  const radarActionStyle = getRadarActionStyle(activeSource.color)

  return (
    <section className="space-y-3" aria-label="Radar cards">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Radar
        </div>
        <div
          className="relative shrink-0"
          style={radarActionStyle}
        >
          <ButtonPrimitive
            onClick={handleForkAndStar}
            aria-label="Fork and star"
            title="Fork and star"
            className="flex h-8 items-center gap-1 rounded-3xl bg-(--radar-action-card-bg) py-0.5 pr-2.5 pl-[4.35rem] text-xs font-semibold transition-colors hover:bg-(--radar-action-card-bg-hover) hover:text-foreground"
          >
            <PhStarFill className="text-sm" />
            Star
          </ButtonPrimitive>
          <ButtonPrimitive
            onClick={handleFork}
            aria-label="Fork only"
            title="Fork only"
            className="absolute top-0.5 left-0.5 inline-flex h-7 items-center gap-1 rounded-3xl bg-background/50 px-2 text-xs font-medium text-(--radar-action-chip-text) opacity-80 transition-all hover:bg-background/70 hover:opacity-100"
          >
            <PhForkDuotone className="text-sm" />
            Fork
          </ButtonPrimitive>
        </div>
      </div>

      <div className="flex justify-center overflow-hidden">
        <div ref={setDeckNode} className="w-full max-w-100 overflow-hidden py-2">
          <motion.div
            className={cn("flex", canDragDeck && "cursor-grab active:cursor-grabbing")}
            drag="x"
            dragControls={dragControls}
            dragConstraints={dragConstraints}
            dragElastic={0.4}
            dragListener={false}
            style={trackStyle}
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
    </section>
  )
}
