import type { ReactNode } from "react"
import type { SourceInstanceMeta } from "@/lib/source-cards"
import type { BoardSource } from "@/typings/source"
import { useSetAtom } from "jotai"
import { useInView } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { FlipAnimate } from "@/components/common/flip-animate"
import { useSourceParams } from "@/hooks"
import { useSourcePermission } from "@/hooks/use-source-permission"
import { useSourceQuery } from "@/hooks/use-source-query"
import { getSourcePermissionDescription } from "@/lib/source-permissions"
import { cn } from "@/lib/utils"
import {
  resetInstanceParamsAtom,
  setSourceInstanceMetaAtom,
  upsertInstanceAtom,
} from "@/store/board"
import { CardBack } from "./card-back"
import { CardFront } from "./card-front"

const CARD_IN_VIEW_MARGIN = "200px"

export interface CardProps {
  id: string
  source: BoardSource
  className?: string
  sizeClassName?: string
  nodeRef?: (node: HTMLElement | null) => void
  dragHandle?: ReactNode
  showStar?: boolean
  isDraft?: boolean
  onDraftSourceChange?: (patch: { paramsPatch?: Record<string, unknown>, metaPatch?: SourceInstanceMeta }) => void
}

function CardContent({ id, source, dragHandle, showStar = true, isDraft = false, onDraftSourceChange }: CardProps) {
  const upsertLocal = useSetAtom(upsertInstanceAtom)
  const resetLocalParams = useSetAtom(resetInstanceParamsAtom)
  const setSourceInstanceMeta = useSetAtom(setSourceInstanceMetaAtom)
  const [isFlipped, setIsFlipped] = useState(false)
  const {
    canLoad,
    permissionRequired,
    requestPermission,
  } = useSourcePermission(source)
  const {
    hasParams,
    savedParams,
    draftParams,
    isDirty,
    updateDraftParam,
    saveDraftParams,
    resetDraftParams,
    discardDraftParams,
  } = useSourceParams({
    params: source.params,
    initialValues: source.paramsValue,
  })

  const { items, refetch, isFetching, isError, errorMessage, loginUrl, updatedAt } = useSourceQuery({
    sourceId: source.sourceId,
    params: savedParams,
    enabled: canLoad,
  })
  const sourceErrorMessage = canLoad && isError
    ? `Failed to load source${errorMessage ? `: ${errorMessage}` : "."}`
    : undefined

  // useEffect(() => {
  //   normalRefetch()
  // }, [date, normalRefetch])

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev)
  }, [])

  const handleSaveSourceParams = useCallback(() => {
    const nextParams = saveDraftParams()
    if (onDraftSourceChange) {
      onDraftSourceChange({ paramsPatch: nextParams })
      return
    }

    const now = Date.now()
    const metaPatch = source.isCustom
      ? {
          providerTitle: source.providerTitle,
          title: source.title,
          desc: source.desc,
          home: source.home,
          color: source.color,
        }
      : undefined
    const origin = source.isCustom && source.origin !== "default" ? source.origin : "fork"
    const nextInstance = {
      instanceId: id,
      sourceId: source.sourceId,
      paramsPatch: nextParams,
      metaPatch,
      origin,
      createdAt: now,
      updatedAt: now,
    }

    upsertLocal(nextInstance)
  }, [source, id, onDraftSourceChange, saveDraftParams, upsertLocal])

  const handleResetSourceParams = useCallback(() => {
    resetDraftParams()
    if (onDraftSourceChange) {
      onDraftSourceChange({ paramsPatch: {} })
      return
    }

    resetLocalParams(id)
  }, [id, onDraftSourceChange, resetDraftParams, resetLocalParams])

  const handleSaveSourceMeta = useCallback((meta: SourceInstanceMeta) => {
    if (onDraftSourceChange) {
      onDraftSourceChange({ metaPatch: meta })
      return
    }

    setSourceInstanceMeta({ instanceId: id, meta })
  }, [id, onDraftSourceChange, setSourceInstanceMeta])

  return (
    <FlipAnimate
      rotate="y"
      flipped={isFlipped}
    >
      <CardFront
        id={id}
        source={source}
        items={items}
        isFetching={isFetching}
        sourceErrorMessage={sourceErrorMessage}
        sourceLoginUrl={canLoad ? loginUrl : undefined}
        sourcePermissionDescription={getSourcePermissionDescription(source)}
        sourcePermissionRequired={permissionRequired}
        updatedAt={updatedAt}
        onRefresh={refetch}
        onRequestPermission={requestPermission}
        onFlip={handleFlip}
        showStar={showStar}
        dragHandle={isFlipped ? undefined : dragHandle}
      />
      <CardBack
        id={id}
        source={source}
        sourceParams={savedParams}
        draftSourceParams={draftParams}
        hasSourceParams={hasParams}
        hasSourceParamChanges={isDirty}
        updatedAt={updatedAt}
        onSourceParamChange={updateDraftParam}
        onSaveSourceParams={handleSaveSourceParams}
        onResetSourceParams={handleResetSourceParams}
        onDiscardSourceParams={discardDraftParams}
        onSaveSourceMeta={handleSaveSourceMeta}
        onFlip={handleFlip}
        isDraft={isDraft}
        dragHandle={isFlipped ? dragHandle : undefined}
      />
    </FlipAnimate>
  )
}

export default function Card(props: CardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [hasEnteredView, setHasEnteredView] = useState(false)
  const setRef = (node: HTMLDivElement | null) => {
    ref.current = node
    props.nodeRef?.(node)
  }

  const isInView = useInView(ref, { once: true, margin: CARD_IN_VIEW_MARGIN })

  useEffect(() => {
    if (isInView) {
      setHasEnteredView(true)
    }
  }, [isInView])

  return (
    <div
      ref={setRef}
      className={cn(
        "select-none",
        props.sizeClassName ?? "h-125 w-100",
        props.className,
      )}
    >
      {hasEnteredView && (
        <CardContent {...props} />
      )}
    </div>
  )
}
