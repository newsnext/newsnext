import type { ReactNode } from "react"
import type { SourceInstanceMeta } from "@/lib/source-cards"
import type { BoardSource } from "@/typings/source"
import { useSetAtom } from "jotai"
import { useInView } from "motion/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { FlipAnimate } from "@/components/common/flip-animate"
import { useSourceParams } from "@/hooks"
import { useSourceQuery } from "@/hooks/use-source-query"
import { cn } from "@/lib/utils"
import {
  resetInstanceParamsAtom,
  setSourceInstanceMetaAtom,
  upsertInstanceAtom,
} from "@/store/board"
import { CardBack } from "./card-back"
import { CardFront, CardRefreshButton } from "./card-front"

const PICTURE_IN_PICTURE_REFRESH_INTERVAL = 1000 * 60
const PICTURE_IN_PICTURE_SIZE = {
  width: 400,
  height: 500,
}
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

function copyPictureInPictureStyles(targetDocument: Document): void {
  targetDocument.documentElement.className = document.documentElement.className
  document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>("link[rel=\"stylesheet\"], style").forEach((node) => {
    targetDocument.head.append(node.cloneNode(true))
  })
}

function CardContent({ id, source, dragHandle, showStar = true, isDraft = false, onDraftSourceChange }: CardProps) {
  const { providerTitle, title } = source
  const upsertLocal = useSetAtom(upsertInstanceAtom)
  const resetLocalParams = useSetAtom(resetInstanceParamsAtom)
  const setSourceInstanceMeta = useSetAtom(setSourceInstanceMetaAtom)
  const [isFlipped, setIsFlipped] = useState(false)
  const [pictureInPictureWindow, setPictureInPictureWindow] = useState<Window | null>(null)
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
    refetchInterval: pictureInPictureWindow ? PICTURE_IN_PICTURE_REFRESH_INTERVAL : false,
  })
  const isPictureInPictureSupported = typeof window !== "undefined" && !!window.documentPictureInPicture
  const sourceErrorMessage = isError
    ? `Failed to load source${errorMessage ? `: ${errorMessage}` : "."}`
    : undefined

  // useEffect(() => {
  //   normalRefetch()
  // }, [date, normalRefetch])

  useEffect(() => {
    if (!pictureInPictureWindow) {
      return
    }

    const handlePageHide = () => {
      setPictureInPictureWindow(null)
    }

    pictureInPictureWindow.addEventListener("pagehide", handlePageHide, { once: true })

    return () => {
      pictureInPictureWindow.removeEventListener("pagehide", handlePageHide)

      if (!pictureInPictureWindow.closed) {
        pictureInPictureWindow.close()
      }
    }
  }, [pictureInPictureWindow])

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

  const handleOpenPictureInPicture = useCallback(async () => {
    if (!window.documentPictureInPicture) {
      return
    }

    if (pictureInPictureWindow && !pictureInPictureWindow.closed) {
      pictureInPictureWindow.focus()
      return
    }

    try {
      const nextWindow = await window.documentPictureInPicture.requestWindow(PICTURE_IN_PICTURE_SIZE)
      nextWindow.document.title = title || providerTitle
      nextWindow.document.body.className = "grid-texture-background m-0 h-screen w-screen overflow-hidden bg-background text-foreground sunrise-theme-400"
      copyPictureInPictureStyles(nextWindow.document)
      setPictureInPictureWindow(nextWindow)
      void refetch()
    } catch (error) {
      console.error("Failed to open picture in picture", error)
    }
  }, [pictureInPictureWindow, providerTitle, refetch, title])

  return (
    <>
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
          sourceLoginUrl={loginUrl}
          updatedAt={updatedAt}
          onRefresh={refetch}
          onFlip={handleFlip}
          onOpenPictureInPicture={handleOpenPictureInPicture}
          isPictureInPictureOpen={!!pictureInPictureWindow && !pictureInPictureWindow.closed}
          isPictureInPictureSupported={isPictureInPictureSupported}
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
      {pictureInPictureWindow && createPortal(
        <div className="grid-texture-background h-screen w-screen bg-background sunrise-theme-400 p-2">
          <div className="h-full w-full">
            <CardFront
              id={id}
              source={source}
              items={items}
              isFetching={isFetching}
              sourceErrorMessage={sourceErrorMessage}
              sourceLoginUrl={loginUrl}
              updatedAt={updatedAt}
              onRefresh={refetch}
              actions={<CardRefreshButton isFetching={isFetching} onRefresh={refetch} />}
            />
          </div>
        </div>,
        pictureInPictureWindow.document.body,
      )}
    </>
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
