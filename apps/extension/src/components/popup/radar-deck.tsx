import type { MotionValue, PanInfo } from "motion/react"
import type { CSSProperties, PointerEvent } from "react"
import type { ResolvedRadarSuggestion } from "@/lib/radar"
import type { InstancePatch } from "@/lib/source"
import type { LiveCardViewModel } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import confetti from "canvas-confetti"
import { useAtomValue, useSetAtom } from "jotai"
import { animate, motion, useDragControls, useMotionValue, useReducedMotion, useTransform } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BoardSelect } from "@/components/common/board-select"
import { PhArrowCircleLeft, PhCircleDashed, PhPlusCircle } from "@/components/icons/ph"
import { LiveCard } from "@/components/live-card"
import { useAsyncAction } from "@/hooks/use-async-action"
import { useI18n } from "@/hooks/use-i18n"
import { createRadarLiveCard } from "@/lib/radar"
import { mergeInstancePatch } from "@/lib/source"
import { cn } from "@/lib/utils"
import { boardsAtom, createInstanceAtom } from "@/store/board"
import { currentBoardIdAtom } from "@/store/settings"

const RADAR_SWIPE_THRESHOLD = 90
const RADAR_SWIPE_VELOCITY_THRESHOLD = 500
const RADAR_CARD_GAP = 8
const RADAR_DECK_SPRING = { type: "spring", stiffness: 300, damping: 30 } as const
const RADAR_CARD_ROTATE_OUTPUT = [-7, 0, 7]
const RADAR_CARD_Y_OUTPUT = [20, 0, 20]
const RADAR_CELEBRATION_DURATION = 900
const RADAR_DECK_NAV_BUTTON_CLASS_NAME = "border-0 text-xl opacity-50 enabled:hover:opacity-85 enabled:active:not-aria-[haspopup]:translate-y-0"
const RADAR_CONFETTI_COLORS: Record<LiveCardViewModel["provider"]["color"], string> = {
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

function getRadarActionStyle(color: LiveCardViewModel["provider"]["color"]): RadarActionStyle {
  return {
    "--radar-action-card-bg": `color-mix(in oklab, var(--color-${color}-400) 40%, transparent)`,
    "--radar-action-card-bg-hover": `color-mix(in oklab, var(--color-${color}-400) 52%, transparent)`,
    "--radar-action-chip-text": `var(--color-${color}-400)`,
  }
}

interface RadarConfettiOptions {
  color: LiveCardViewModel["provider"]["color"]
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

interface RadarLiveCardProps {
  liveCard: LiveCardViewModel
  className?: string
  onPatchChange: (patch: InstancePatch) => void
}

function RadarLiveCard({ liveCard, className, onPatchChange }: RadarLiveCardProps) {
  return (
    <LiveCard
      source={liveCard}
      target={{ kind: "draft", onPatchChange }}
      className={cn(
        "overflow-hidden rounded-3xl",
        className,
      )}
      sizeClassName="h-[30rem] w-full"
    />
  )
}

interface RadarTrackCardProps {
  index: number
  liveCard: LiveCardViewModel
  trackItemOffset: number
  x: MotionValue<number>
  onDragHandlePointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onPatchChange: (patch: InstancePatch) => void
}

function RadarTrackCard({
  index,
  liveCard,
  trackItemOffset,
  x,
  onDragHandlePointerDown,
  onPatchChange,
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
        <RadarLiveCard
          liveCard={liveCard}
          onPatchChange={onPatchChange}
        />
      </div>
    </motion.div>
  )
}

interface RadarDeckProps {
  layout?: "dialog" | "popup"
  onCreationStart?: () => void
  onCreated?: () => void
  suggestions: ResolvedRadarSuggestion[]
}

interface RadarDeckContentProps extends RadarDeckProps {
  initialBoardId?: string
  layout: "dialog" | "popup"
}

export function RadarDeck({
  layout = "popup",
  onCreated,
  onCreationStart,
  suggestions,
}: RadarDeckProps) {
  const boards = useAtomValue(boardsAtom)
  const currentBoardId = useAtomValue(currentBoardIdAtom)
  const initialBoardId = boards.find(board => board.id === currentBoardId)?.id
    ?? boards[0]?.id
  const deckKey = `${suggestions.map(suggestion => suggestion.id).join("\0")}\0${initialBoardId ?? ""}`
  return (
    <RadarDeckContent
      key={deckKey}
      layout={layout}
      initialBoardId={initialBoardId}
      onCreated={onCreated}
      onCreationStart={onCreationStart}
      suggestions={suggestions}
    />
  )
}

function RadarDeckContent({
  initialBoardId,
  layout,
  onCreated,
  onCreationStart,
  suggestions,
}: RadarDeckContentProps) {
  const { t } = useI18n()
  const isDialog = layout === "dialog"
  const createInstance = useSetAtom(createInstanceAtom)
  const [targetBoardId, setTargetBoardId] = useState(initialBoardId)
  const [activeIndex, setActiveIndex] = useState(0)
  const [draftPatches, setDraftPatches] = useState<Record<string, InstancePatch>>({})
  const [trackItemOffset, setTrackItemOffset] = useState(1)
  const [hasMeasuredDeck, setHasMeasuredDeck] = useState(false)
  const [isCreated, setIsCreated] = useState(false)
  const { error: createError, isPending: isCreating, run: runCreate } = useAsyncAction(
    t("createLiveCardFailed"),
  )
  const actionRef = useRef<HTMLDivElement>(null)
  const deckRef = useRef<HTMLDivElement>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const dragControls = useDragControls()
  const x = useMotionValue(0)
  const prefersReducedMotion = useReducedMotion() ?? false

  const finishCreation = useCallback(() => {
    if (onCreated) {
      onCreated()
    } else {
      window.close()
    }
  }, [onCreated])

  useEffect(() => {
    if (!isCreated) return
    if (prefersReducedMotion) {
      finishCreation()
      return
    }

    const timeout = window.setTimeout(finishCreation, RADAR_CELEBRATION_DURATION)
    return () => window.clearTimeout(timeout)
  }, [finishCreation, isCreated, prefersReducedMotion])

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

  const radarLiveCards = useMemo(() => {
    return suggestions.map(suggestion => ({
      suggestion,
      liveCard: createRadarLiveCard(suggestion, draftPatches[suggestion.id]),
    }))
  }, [draftPatches, suggestions])
  const activeSuggestion = suggestions[activeIndex]
  const activeLiveCard = radarLiveCards[activeIndex]?.liveCard ?? null
  const canGoPrevious = activeIndex > 0
  const canGoNext = activeIndex < suggestions.length - 1
  const canDragDeck = hasMeasuredDeck && suggestions.length > 1

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
    if (isCreated || !activeSuggestion || !activeLiveCard || !targetBoardId) {
      return
    }

    await runCreate(async () => {
      await createInstance({
        boardId: targetBoardId,
        sourceId: activeSuggestion.sourceId,
        patch: mergeInstancePatch(
          activeSuggestion.patch,
          draftPatches[activeSuggestion.id] ?? {},
        ),
      })
      onCreationStart?.()
      setIsCreated(true)
      launchRadarConfetti({
        color: activeLiveCard.provider.color,
        originElement: actionRef.current,
      })
    })
  }, [activeLiveCard, activeSuggestion, createInstance, draftPatches, isCreated, onCreationStart, runCreate, targetBoardId])

  const handleDraftSourceChange = useCallback((suggestionId: string, patch: InstancePatch) => {
    setDraftPatches((prev) => {
      const nextPatch = mergeInstancePatch(prev[suggestionId], patch)
      const resolvedPatch = patch.params && Object.keys(patch.params).length === 0
        ? { ...nextPatch, params: {} }
        : nextPatch

      return {
        ...prev,
        [suggestionId]: resolvedPatch,
      }
    })
  }, [])

  if (!activeSuggestion || !activeLiveCard) {
    return null
  }

  const radarActionStyle = getRadarActionStyle(activeLiveCard.provider.color)

  return (
    <section
      className={cn("relative", isDialog ? "space-y-2" : "space-y-3")}
      aria-label={t("radarSuggestions")}
    >
      <div className={cn("flex justify-center", isDialog ? "overflow-visible" : "overflow-hidden")}>
        <div
          ref={setDeckNode}
          className={cn(
            "w-full max-w-100 overflow-hidden",
            isDialog && "relative isolate overflow-visible before:absolute before:inset-0 before:-z-10 before:rounded-3xl before:bg-background before:content-['']",
          )}
        >
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
            {radarLiveCards.map(({ suggestion, liveCard }, index) => liveCard && (
              <RadarTrackCard
                key={suggestion.id}
                index={index}
                liveCard={liveCard}
                trackItemOffset={trackItemOffset}
                x={x}
                onDragHandlePointerDown={handleDragHandlePointerDown}
                onPatchChange={patch => handleDraftSourceChange(suggestion.id, patch)}
              />
            ))}
          </motion.div>
        </div>
      </div>
      <div
        className={cn(
          "flex items-center gap-3",
          suggestions.length > 1 ? "justify-between" : "justify-end",
          isDialog && "px-1",
        )}
      >
        {suggestions.length > 1 && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="transparent"
              size="icon-fit"
              onClick={() => moveDeck(-1)}
              disabled={!canGoPrevious}
              aria-label={t("previousRadarSuggestion")}
              title={t("previousRadarSuggestion")}
              className={cn(RADAR_DECK_NAV_BUTTON_CLASS_NAME, !canGoPrevious && "opacity-20")}
            >
              <PhArrowCircleLeft />
            </Button>
            <Button
              variant="transparent"
              size="icon-fit"
              onClick={() => moveDeck(1)}
              disabled={!canGoNext}
              aria-label={t("nextRadarSuggestion")}
              title={t("nextRadarSuggestion")}
              className={cn(RADAR_DECK_NAV_BUTTON_CLASS_NAME, "rotate-180", !canGoNext && "opacity-20")}
            >
              <PhArrowCircleLeft />
            </Button>
          </div>
        )}
        <div
          ref={actionRef}
          className={cn(
            "flex min-w-0 items-center gap-1.5",
            isDialog && "rounded-full bg-background p-1 ring-1 ring-foreground/10",
          )}
          style={radarActionStyle}
        >
          <BoardSelect
            value={targetBoardId}
            onValueChange={setTargetBoardId}
            ariaLabel={t("destinationBoard")}
            align="end"
            className={cn(
              "max-w-36 border-0 text-xs shadow-none",
              isDialog ? "bg-transparent hover:bg-foreground/5" : "bg-background/50",
            )}
          />
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={isCreated || isCreating || targetBoardId === undefined}
            aria-label={t("createLiveCard")}
            title={t("createLiveCard")}
            className={cn(
              "flex h-8 items-center gap-1 rounded-3xl bg-(--radar-action-card-bg) px-3 py-0.5 text-xs font-semibold transition-colors enabled:hover:bg-(--radar-action-card-bg-hover) enabled:hover:text-foreground",
              isDialog && "px-3.5",
            )}
          >
            {isCreating
              ? <PhCircleDashed className="animate-spin text-sm text-(--radar-action-chip-text)" />
              : <PhPlusCircle className="text-sm text-(--radar-action-chip-text)" />}
            {t("createLiveCard")}
          </Button>
          {createError && <span role="alert" className="text-xs text-destructive">{createError}</span>}
        </div>
      </div>
    </section>
  )
}
