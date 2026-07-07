import type { RadarContext, RadarSuggestion } from "@/lib/radar"
import type { SourceInstanceMeta } from "@/lib/source-cards"
import type { BoardSource } from "@/typings/source"
import { ButtonPrimitive } from "@newsnext/ui/components/button"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useSetAtom } from "jotai"
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react"
import { useCallback, useEffect, useMemo, useState } from "react"
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
      className={className}
      sizeClassName="h-[30rem] w-full"
      showStar={false}
      isDraft
      onDraftSourceChange={onDraftSourceChange}
    />
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
  const [exitDirection, setExitDirection] = useState(0)
  const [draftPatches, setDraftPatches] = useState<Record<string, RadarDraftPatch>>({})
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-160, 160], [-7, 7])

  useEffect(() => {
    setActiveIndex(0)
    setExitDirection(0)
    x.set(0)
  }, [suggestions, x])

  const activeSuggestion = suggestions[activeIndex]
  const visibleSuggestions = suggestions.slice(activeIndex, activeIndex + 3)
  const activeSource = activeSuggestion ? createRadarBoardSource(activeSuggestion, draftPatches[activeSuggestion.id]) : null
  const canGoPrevious = activeIndex > 0
  const canGoNext = activeIndex < suggestions.length - 1

  const moveDeck = useCallback((direction: number) => {
    setExitDirection(direction)
    setActiveIndex(prev => Math.min(Math.max(prev + direction, 0), suggestions.length - 1))
  }, [suggestions.length])

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

      <div className="relative h-[31rem] overflow-hidden">
        {visibleSuggestions.slice(1).map((suggestion, index) => {
          const source = createRadarBoardSource(suggestion)
          if (!source) {
            return null
          }

          return (
            <div
              key={suggestion.id}
              className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-full max-w-[25rem]"
              style={{
                transform: `translateY(${(index + 1) * 12}px) scale(${1 - (index + 1) * 0.05})`,
                zIndex: 2 - index,
              }}
              aria-hidden
            >
              <RadarSourceCard
                source={source}
              />
            </div>
          )
        })}

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeSuggestion.id}
            className="absolute inset-x-0 top-0 z-10 mx-auto w-full max-w-[25rem] cursor-grab active:cursor-grabbing"
            style={{ x, rotate }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            initial={{ opacity: 0, x: exitDirection >= 0 ? 80 : -80, rotate: exitDirection >= 0 ? 5 : -5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: exitDirection >= 0 ? -180 : 180, rotate: exitDirection >= 0 ? -8 : 8 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > RADAR_SWIPE_THRESHOLD && canGoPrevious) {
                moveDeck(-1)
                return
              }

              if (info.offset.x < -RADAR_SWIPE_THRESHOLD && canGoNext) {
                moveDeck(1)
              }
            }}
          >
            <RadarSourceCard
              source={activeSource}
              onDraftSourceChange={handleActiveDraftSourceChange}
            />
          </motion.div>
        </AnimatePresence>
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
