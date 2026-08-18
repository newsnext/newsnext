import type { MotionValue, PanInfo } from "motion/react"
import type { CSSProperties, PointerEvent } from "react"
import type { RadarSuggestion } from "@/lib/radar"
import type { SourceInstancePatch } from "@/lib/source"
import type { CardViewModel, SourceDescriptor } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import confetti from "canvas-confetti"
import { useAtomValue, useSetAtom } from "jotai"
import { animate, motion, useDragControls, useMotionValue, useReducedMotion, useTransform } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { SourceCard } from "@/components/card"
import { BoardMembershipSelect } from "@/components/common/board-membership-select"
import { PhArrowCircleLeft, PhPlusCircle } from "@/components/icons/ph"
import { useAsyncAction } from "@/hooks/use-async-action"
import { ALL_BOARD_ID } from "@/lib/board"
import { createRadarBoardSource } from "@/lib/radar"
import { mergeSourceInstancePatch } from "@/lib/source"
import { cn } from "@/lib/utils"
import { addInstanceAtom } from "@/store/board"
import { currentBoardIdAtom } from "@/store/settings"

const RADAR_SWIPE_THRESHOLD = 90
const RADAR_SWIPE_VELOCITY_THRESHOLD = 500
const RADAR_CARD_GAP = 8
const RADAR_DECK_SPRING = { type: "spring", stiffness: 300, damping: 30 } as const
const RADAR_CARD_ROTATE_OUTPUT = [-7, 0, 7]
const RADAR_CARD_Y_OUTPUT = [20, 0, 20]
const RADAR_CELEBRATION_DURATION = 900
const RADAR_DECK_NAV_BUTTON_CLASS_NAME = "border-0 text-xl opacity-50 hover:opacity-85 active:not-aria-[haspopup]:translate-y-0"
const RADAR_REDUCED_MOTION_CELEBRATION_DURATION = 180
const RADAR_CONFETTI_COLORS: Record<CardViewModel["provider"]["color"], string> = {
  red: "#f87171",
  pink: "#f472b6",
  fuchsia: "#e879f9",
  purple: "#c084fc",
  indigo: "#818cf8",
  blue: "#60a5fa",
  cyan: "#22d3ee",
  teal: "#2dd4bf",
  green: "#4ade80",
  amber: "#fbbf24",
  orange: "#fb923c",
  slate: "#94a3b8",
}

function getRadarTrackX(index: number, trackItemOffset: number): number {
  return -(index * trackItemOffset)
}

interface RadarActionStyle extends CSSProperties {
  "--radar-action-card-bg": string
  "--radar-action-card-bg-hover": string
  "--radar-action-chip-text": string
}

function getRadarActionStyle(color: CardViewModel["provider"]["color"]): RadarActionStyle {
  return {
    "--radar-action-card-bg": `color-mix(in oklab, var(--color-${color}-400) 40%, transparent)`,
    "--radar-action-card-bg-hover": `color-mix(in oklab, var(--color-${color}-400) 52%, transparent)`,
    "--radar-action-chip-text": `var(--color-${color}-400)`,
  }
}

interface RadarConfettiOptions {
  color: CardViewModel["provider"]["color"]
  originElement: HTMLElement | null
}

function launchRadarConfetti({ color, originElement }: RadarConfettiOptions): void {
  const rect = originElement?.getBoundingClientRect()
  const origin = rect
    ? {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      }
    : { x: 0.18, y: 0.92 }
  const activeColor = RADAR_CONFETTI_COLORS[color]

  void confetti({
    particleCount: 56,
    angle: 78,
    spread: 72,
    startVelocity: 34,
    decay: 0.91,
    gravity: 0.9,
    ticks: 58,
    scalar: 0.72,
    origin,
    colors: [activeColor, "#fbbf24", "#fb7185", "#f8fafc"],
    shapes: ["square", "circle"],
    disableForReducedMotion: true,
    zIndex: 50,
  })
}

interface RadarSourceCardProps {
  source: CardViewModel
  className?: string
  onDraftSourceChange?: (patch: SourceInstancePatch) => void
}

function RadarSourceCard({ source, className, onDraftSourceChange }: RadarSourceCardProps) {
  return (
    <SourceCard
      id={source.id}
      source={source}
      className={cn(
        "overflow-hidden rounded-3xl [&_[data-card-header]]:pr-20",
        className,
      )}
      sizeClassName="h-[30rem] w-full"
      isDraft
      onDraftSourceChange={onDraftSourceChange}
    />
  )
}

interface RadarTrackCardProps {
  index: number
  source: CardViewModel
  trackItemOffset: number
  x: MotionValue<number>
  onDragHandlePointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onDraftSourceChange?: (patch: SourceInstancePatch) => void
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
    <p className="px-5 py-12 text-center text-sm text-muted-foreground">
      No radar cards for this page.
    </p>
  )
}

interface RadarDeckProps {
  sourceDescriptors: SourceDescriptor[]
  suggestions: RadarSuggestion[]
}

export function RadarDeck({ sourceDescriptors, suggestions }: RadarDeckProps) {
  const deckKey = suggestions.map(suggestion => suggestion.id).join("\0")
  return (
    <RadarDeckContent
      key={deckKey}
      sourceDescriptors={sourceDescriptors}
      suggestions={suggestions}
    />
  )
}

function RadarDeckContent({ sourceDescriptors, suggestions }: RadarDeckProps) {
  const addInstance = useSetAtom(addInstanceAtom)
  const currentBoardId = useAtomValue(currentBoardIdAtom)
  const [targetBoardId, setTargetBoardId] = useState<string | null>(
    currentBoardId === ALL_BOARD_ID ? null : currentBoardId,
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const [draftPatches, setDraftPatches] = useState<Record<string, SourceInstancePatch>>({})
  const [trackItemOffset, setTrackItemOffset] = useState(1)
  const [hasMeasuredDeck, setHasMeasuredDeck] = useState(false)
  const [isCreated, setIsCreated] = useState(false)
  const { error: createError, isPending: isCreating, run: runCreate } = useAsyncAction(
    "The card could not be created.",
  )
  const actionRef = useRef<HTMLDivElement>(null)
  const deckRef = useRef<HTMLDivElement>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const dragControls = useDragControls()
  const x = useMotionValue(0)
  const prefersReducedMotion = useReducedMotion() ?? false

  useEffect(() => {
    if (!isCreated) {
      return
    }

    const duration = prefersReducedMotion
      ? RADAR_REDUCED_MOTION_CELEBRATION_DURATION
      : RADAR_CELEBRATION_DURATION
    const timeout = window.setTimeout(() => window.close(), duration)

    return () => window.clearTimeout(timeout)
  }, [isCreated, prefersReducedMotion])

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

  const handleCreate = useCallback(async () => {
    if (isCreated || !activeSuggestion || !activeSource) {
      return
    }

    await runCreate(async () => {
      await addInstance({
        collectionId: targetBoardId,
        sourceId: activeSuggestion.sourceId,
        patch: mergeSourceInstancePatch(
          activeSuggestion.patch,
          draftPatches[activeSuggestion.id] ?? {},
        ),
      })
      launchRadarConfetti({ color: activeSource.provider.color, originElement: actionRef.current })
      setIsCreated(true)
    })
  }, [activeSource, activeSuggestion, addInstance, draftPatches, isCreated, runCreate, targetBoardId])

  const handleActiveDraftSourceChange = useCallback((patch: SourceInstancePatch) => {
    if (!activeSuggestion) {
      return
    }

    setDraftPatches((prev) => {
      const nextPatch = mergeSourceInstancePatch(prev[activeSuggestion.id], patch)
      const resolvedPatch = patch.params && Object.keys(patch.params).length === 0
        ? { ...nextPatch, params: {} }
        : nextPatch

      return {
        ...prev,
        [activeSuggestion.id]: resolvedPatch,
      }
    })
  }, [activeSuggestion])

  if (!activeSuggestion || !activeSource) {
    return <RadarEmptyState />
  }

  const radarActionStyle = getRadarActionStyle(activeSource.provider.color)

  return (
    <motion.section
      className="relative space-y-3"
      aria-label="Radar cards"
      animate={isCreated && !prefersReducedMotion
        ? { scale: [1, 1.008, 0.985], opacity: [1, 1, 0] }
        : undefined}
      transition={isCreated && !prefersReducedMotion
        ? { duration: RADAR_CELEBRATION_DURATION / 1000, times: [0, 0.7, 1], ease: "easeInOut" }
        : undefined}
    >
      <div className="flex justify-center overflow-hidden">
        <div ref={setDeckNode} className="w-full max-w-100 overflow-hidden">
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
        <div ref={actionRef} className="flex min-w-0 items-center gap-1.5" style={radarActionStyle}>
          <BoardMembershipSelect
            value={targetBoardId}
            onValueChange={setTargetBoardId}
            ariaLabel="Destination board"
            align="start"
            className="max-w-36 border-0 bg-background/50 text-xs shadow-none"
          />
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={isCreated || isCreating}
            aria-label="Create card"
            title="Create card"
            className="flex h-8 items-center gap-1 rounded-3xl bg-(--radar-action-card-bg) px-3 py-0.5 text-xs font-semibold transition-colors hover:bg-(--radar-action-card-bg-hover) hover:text-foreground"
          >
            <PhPlusCircle className="text-sm text-(--radar-action-chip-text)" />
            Create card
          </Button>
          {createError && <span role="alert" className="text-xs text-destructive">{createError}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="transparent"
            size="icon-fit"
            onClick={() => moveDeck(-1)}
            disabled={!canGoPrevious}
            aria-label="Previous radar card"
            title="Previous radar card"
            className={cn(RADAR_DECK_NAV_BUTTON_CLASS_NAME, !canGoPrevious && "opacity-20")}
          >
            <PhArrowCircleLeft />
          </Button>
          <Button
            variant="transparent"
            size="icon-fit"
            onClick={() => moveDeck(1)}
            disabled={!canGoNext}
            aria-label="Next radar card"
            title="Next radar card"
            className={cn(RADAR_DECK_NAV_BUTTON_CLASS_NAME, "rotate-180", !canGoNext && "opacity-20")}
          >
            <PhArrowCircleLeft />
          </Button>
        </div>
      </div>
    </motion.section>
  )
}
