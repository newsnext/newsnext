import type { ReactNode } from "react"
import type { BoardSource, NewsItem } from "@/typings/source"
import { useSetAtom } from "jotai"
import { useInView } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { FlipAnimate } from "@/components/common/flip-animate"
import { useSourceParams } from "@/hooks"
import { useSourceQuery } from "@/hooks/use-source-query"
import { cn } from "@/lib/utils"
import {
  resetInstanceParamsAtom,
  upsertInstanceAtom,
} from "@/store/board"
import { useExpandedPreview } from "../preview/expanded-preview-context"
import { CardBack } from "./card-back"
import { CardPreviewContext } from "./card-context"
import { CardFront } from "./card-front"

const HOVER_PREVIEW_ENABLED = true
const PICTURE_IN_PICTURE_REFRESH_INTERVAL = 1000 * 60
const PICTURE_IN_PICTURE_SIZE = {
  width: 400,
  height: 500,
}
const PICTURE_IN_PICTURE_PREVIEW_CONTEXT = {
  onOpenExpandedPreview: () => {},
  canOpenExpandedPreview: false,
  canShowHoverPreview: false,
}

export interface CardProps {
  id: string
  source: BoardSource
  className?: string
  nodeRef?: (node: HTMLElement | null) => void
  dragHandle?: ReactNode
  disableExpandedPreview?: boolean
  previewSelection?: {
    selectedItemUrl?: string
    onSelectItem: (item: NewsItem) => void
  }
}

function copyPictureInPictureStyles(targetDocument: Document): void {
  targetDocument.documentElement.className = document.documentElement.className
  document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>("link[rel=\"stylesheet\"], style").forEach((node) => {
    targetDocument.head.append(node.cloneNode(true))
  })
}

function CardContent({ id, source, dragHandle, disableExpandedPreview = false, previewSelection }: CardProps) {
  const { providerTitle, title } = source
  const { isExpandedPreviewOpen, openExpandedPreview } = useExpandedPreview()
  const upsertLocal = useSetAtom(upsertInstanceAtom)
  const resetLocalParams = useSetAtom(resetInstanceParamsAtom)
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
    storageId: id,
    params: source.params,
    initialValues: source.paramsValue,
  })

  const { items, refetch, isFetching, isError, errorMessage, updatedTime } = useSourceQuery({
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
    const nextInstance = {
      instanceId: id,
      sourceId: source.sourceId,
      params: nextParams,
      isFork: source.isFork,
      createdAt: Date.now(),
    }

    upsertLocal(nextInstance)
  }, [source.sourceId, source.isFork, id, saveDraftParams, upsertLocal])

  const handleResetSourceParams = useCallback(() => {
    resetDraftParams()
    resetLocalParams({ instanceId: id, isFork: source.isFork })
  }, [source.isFork, id, resetDraftParams, resetLocalParams])

  const handleOpenExpandedPreview = useCallback((item: NewsItem) => {
    openExpandedPreview(id, source, item)
  }, [id, source, openExpandedPreview])

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
      nextWindow.document.body.className = "grid-texture-background m-0 h-screen w-screen overflow-hidden bg-background text-foreground sprinkle-theme-400"
      copyPictureInPictureStyles(nextWindow.document)
      setPictureInPictureWindow(nextWindow)
      void refetch()
    } catch (error) {
      console.error("Failed to open picture in picture", error)
    }
  }, [pictureInPictureWindow, providerTitle, refetch, title])

  const previewContextValue = useMemo(
    () => ({
      onOpenExpandedPreview: handleOpenExpandedPreview,
      canOpenExpandedPreview: !disableExpandedPreview,
      canShowHoverPreview: HOVER_PREVIEW_ENABLED && !isExpandedPreviewOpen,
    }),
    [handleOpenExpandedPreview, disableExpandedPreview, isExpandedPreviewOpen],
  )
  return (
    <CardPreviewContext.Provider value={previewContextValue}>
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
          updatedTime={updatedTime}
          onRefresh={refetch}
          onFlip={handleFlip}
          onOpenPictureInPicture={handleOpenPictureInPicture}
          isPictureInPictureOpen={!!pictureInPictureWindow && !pictureInPictureWindow.closed}
          isPictureInPictureSupported={isPictureInPictureSupported}
          dragHandle={isFlipped ? undefined : dragHandle}
          previewSelection={previewSelection}
        />
        <CardBack
          id={id}
          source={source}
          sourceParams={savedParams}
          draftSourceParams={draftParams}
          hasSourceParams={hasParams}
          hasSourceParamChanges={isDirty}
          updatedTime={updatedTime}
          onSourceParamChange={updateDraftParam}
          onSaveSourceParams={handleSaveSourceParams}
          onResetSourceParams={handleResetSourceParams}
          onDiscardSourceParams={discardDraftParams}
          onFlip={handleFlip}
          dragHandle={isFlipped ? dragHandle : undefined}
        />
      </FlipAnimate>
      {pictureInPictureWindow && createPortal(
        <div className="grid-texture-background h-screen w-screen bg-background sprinkle-theme-400 p-2">
          <div className="h-full w-full">
            <CardPreviewContext.Provider value={PICTURE_IN_PICTURE_PREVIEW_CONTEXT}>
              <CardFront
                id={id}
                source={source}
                items={items}
                isFetching={isFetching}
                sourceErrorMessage={sourceErrorMessage}
                updatedTime={updatedTime}
                onRefresh={refetch}
                actionsVariant="refresh-only"
              />
            </CardPreviewContext.Provider>
          </div>
        </div>,
        pictureInPictureWindow.document.body,
      )}
    </CardPreviewContext.Provider>
  )
}

export default function Card(props: CardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [hasEnteredView, setHasEnteredView] = useState(false)
  const setRef = (node: HTMLDivElement | null) => {
    ref.current = node
    props.nodeRef?.(node)
  }

  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (isInView) {
      setHasEnteredView(true)
    }
  }, [isInView])

  return (
    <div
      ref={setRef}
      className={cn(
        "h-125 w-100",
        props.className,
      )}
    >
      {hasEnteredView && (
        <CardContent {...props} />
      )}
    </div>
  )
}
