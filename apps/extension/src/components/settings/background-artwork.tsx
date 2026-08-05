import type { ChangeEvent, CSSProperties, DragEvent, KeyboardEvent, ReactNode } from "react"
import type { BackgroundArtworkFormat, BackgroundArtworkTransform } from "@/lib/background-artwork"
import { Button } from "@newsnext/ui/components/button"
import { Card, CardContent } from "@newsnext/ui/components/card"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import { Slider } from "@newsnext/ui/components/slider"
import { useAtom } from "jotai"
import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { PhArrowCounterClockwiseDuotone } from "@/components/icons/ph"
import {
  areBackgroundArtworkTransformsEqual,
  createBackgroundLineArt,
  DEFAULT_BACKGROUND_ARTWORK_TRANSFORM,
  DEFAULT_LINE_ART_THRESHOLD,
  MAX_BACKGROUND_ARTWORK_FILE_SIZE,
  MAX_BACKGROUND_ARTWORK_OPACITY,
  MIN_BACKGROUND_ARTWORK_OPACITY,
  normalizeBackgroundArtworkTransform,
  releaseBackgroundArtworkSource,
} from "@/lib/background-artwork"
import {
  loadBackgroundArtworkAspectRatio,
  resolveBackgroundArtworkCenter,
  resolveBackgroundArtworkLayout,
  resolveBackgroundArtworkTranslation,
} from "@/lib/background-artwork-layout"
import { cn } from "@/lib/utils"
import {
  backgroundArtworkAtom,
  backgroundArtworkOpacityAtom,
  backgroundArtworkTransformAtom,
} from "@/store/settings"
import { SettingsSection } from "./layout"

const BackgroundArtworkMoveable = lazy(() => import("./background-artwork-moveable"))

interface ProcessingStatus {
  kind: "error" | "progress"
  message: string
}

interface PreviewCanvasStyle extends CSSProperties {
  "--background-grid-size": string
}

interface TransformDraft {
  baseline: BackgroundArtworkTransform
  value: BackgroundArtworkTransform
}

interface ArtworkAspectRatioState {
  artwork: string
  value: number
}

interface ViewportSize {
  height: number
  width: number
}

export function BackgroundArtworkSettings(): React.JSX.Element {
  const [savedArtwork, setSavedArtwork] = useAtom(backgroundArtworkAtom)
  const [backgroundOpacity, setBackgroundOpacity] = useAtom(backgroundArtworkOpacityAtom)
  const [savedTransform, setSavedTransform] = useAtom(backgroundArtworkTransformAtom)
  const [draftArtwork, setDraftArtwork] = useState<string | null>(null)
  const [transformDraft, setTransformDraft] = useState<TransformDraft>(() => ({
    baseline: savedTransform,
    value: savedTransform,
  }))
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [threshold, setThreshold] = useState(DEFAULT_LINE_ART_THRESHOLD)
  const [format, setFormat] = useState<BackgroundArtworkFormat>("svg")
  const [status, setStatus] = useState<ProcessingStatus | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [artworkElement, setArtworkElement] = useState<HTMLDivElement | null>(null)
  const [previewCanvasElement, setPreviewCanvasElement] = useState<HTMLDivElement | null>(null)
  const [previewCanvasSize, setPreviewCanvasSize] = useState<ViewportSize>({ height: 0, width: 0 })
  const [artworkAspectRatioState, setArtworkAspectRatioState] = useState<ArtworkAspectRatioState | null>(null)
  const [viewportSize, setViewportSize] = useState<ViewportSize>(() => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }))
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processingIdRef = useRef(0)
  const draftTransform = areBackgroundArtworkTransformsEqual(transformDraft.baseline, savedTransform)
    ? transformDraft.value
    : savedTransform

  useEffect(() => {
    function updateViewportSize(): void {
      setViewportSize({
        height: window.innerHeight,
        width: window.innerWidth,
      })
    }

    window.addEventListener("resize", updateViewportSize)
    return () => window.removeEventListener("resize", updateViewportSize)
  }, [])

  useEffect(() => {
    if (!previewCanvasElement) return

    const observer = new ResizeObserver(([entry]) => {
      const rect = entry?.contentRect
      if (!rect) return
      setPreviewCanvasSize({ height: rect.height, width: rect.width })
    })
    observer.observe(previewCanvasElement)
    return () => observer.disconnect()
  }, [previewCanvasElement])

  useEffect(() => {
    if (!sourceFile) return

    const processingId = processingIdRef.current + 1
    processingIdRef.current = processingId
    const timeoutId = window.setTimeout(() => {
      setStatus({ kind: "progress", message: "Extracting line art…" })
      void createBackgroundLineArt(sourceFile, threshold, format).then((artwork) => {
        if (processingIdRef.current !== processingId) return
        setDraftArtwork(artwork)
        setStatus(null)
      }).catch((error: unknown) => {
        if (processingIdRef.current !== processingId) return
        setStatus({
          kind: "error",
          message: error instanceof Error ? error.message : "The image could not be processed.",
        })
      })
    }, 180)

    return () => {
      window.clearTimeout(timeoutId)
      if (processingIdRef.current === processingId) {
        processingIdRef.current += 1
      }
    }
  }, [format, sourceFile, threshold])

  useEffect(() => {
    if (!sourceFile) return
    return () => releaseBackgroundArtworkSource(sourceFile)
  }, [sourceFile])

  const previewArtwork = draftArtwork ?? savedArtwork

  useEffect(() => {
    if (!previewArtwork) return

    let cancelled = false
    void loadBackgroundArtworkAspectRatio(previewArtwork).then((value) => {
      if (!cancelled) setArtworkAspectRatioState({ artwork: previewArtwork, value })
    }).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [previewArtwork])

  function selectFile(file: File): void {
    if (!file.type.startsWith("image/")) {
      setStatus({ kind: "error", message: "Choose an image file." })
      return
    }
    if (file.size > MAX_BACKGROUND_ARTWORK_FILE_SIZE) {
      setStatus({ kind: "error", message: "Choose an image smaller than 12 MB." })
      return
    }

    setDraftArtwork(null)
    replaceDraftTransform(DEFAULT_BACKGROUND_ARTWORK_TRANSFORM)
    setStatus(null)
    setSourceFile(file)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (file) selectFile(file)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) selectFile(file)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>): void {
    const nextTarget = event.relatedTarget
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setIsDragging(false)
    }
  }

  function updateDraftTransform(update: Partial<BackgroundArtworkTransform>): void {
    setTransformDraft((current) => {
      const currentValue = areBackgroundArtworkTransformsEqual(current.baseline, savedTransform)
        ? current.value
        : savedTransform
      return {
        baseline: savedTransform,
        value: normalizeBackgroundArtworkTransform({
          ...currentValue,
          ...update,
          positionMode: "viewport-center",
        }),
      }
    })
  }

  function replaceDraftTransform(value: BackgroundArtworkTransform): void {
    setTransformDraft({
      baseline: savedTransform,
      value: { ...value },
    })
  }

  function handleRemove(): void {
    processingIdRef.current += 1
    setSourceFile(null)
    setDraftArtwork(null)
    replaceDraftTransform(DEFAULT_BACKGROUND_ARTWORK_TRANSFORM)
    setSavedArtwork(null)
    setSavedTransform({ ...DEFAULT_BACKGROUND_ARTWORK_TRANSFORM })
    setStatus(null)
  }

  const viewportWidth = Math.max(viewportSize.width, 1)
  const viewportHeight = Math.max(viewportSize.height, 1)
  const previewCanvasStyle: PreviewCanvasStyle = {
    "--background-grid-size": `${24 / viewportWidth * 100}% ${32 / viewportHeight * 100}%`,
    "aspectRatio": `${viewportWidth} / ${viewportHeight}`,
    "maxHeight": "16rem",
    "maxWidth": `${viewportWidth / viewportHeight * 16}rem`,
    "width": "100%",
  }
  const artworkAspectRatio = artworkAspectRatioState?.artwork === previewArtwork
    ? artworkAspectRatioState.value
    : null
  const artworkLayout = artworkAspectRatio === null || previewCanvasSize.width === 0
    ? null
    : resolveBackgroundArtworkLayout(viewportWidth, viewportHeight, artworkAspectRatio)
  const previewScale = previewCanvasSize.width / viewportWidth
  const previewArtworkLayout = artworkLayout
    ? {
        height: artworkLayout.height * previewScale,
        left: artworkLayout.left * previewScale,
        top: artworkLayout.top * previewScale,
        width: artworkLayout.width * previewScale,
      }
    : null
  const previewArtworkCenter = previewArtworkLayout
    ? resolveBackgroundArtworkCenter(
        previewArtworkLayout,
        previewCanvasSize.height,
        draftTransform,
      )
    : null
  const previewArtworkTranslation = previewArtworkLayout && previewArtworkCenter
    ? resolveBackgroundArtworkTranslation(
        previewArtworkLayout,
        previewCanvasSize.width,
        previewCanvasSize.height,
        previewArtworkCenter.x,
        previewArtworkCenter.y,
      )
    : null

  function handlePreviewKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (previewArtwork && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault()
      if (!previewArtworkCenter || previewCanvasSize.width <= 0 || previewCanvasSize.height <= 0) return

      const distance = event.shiftKey ? 5 : 1
      const horizontalDistance = distance / previewCanvasSize.width * 100
      const verticalDistance = distance / previewCanvasSize.height * 100
      updateDraftTransform({
        x: previewArtworkCenter.x
          + (event.key === "ArrowLeft" ? -horizontalDistance : event.key === "ArrowRight" ? horizontalDistance : 0),
        y: previewArtworkCenter.y
          + (event.key === "ArrowUp" ? -verticalDistance : event.key === "ArrowDown" ? verticalDistance : 0),
      })
      return
    }

    if (previewArtwork || (event.key !== "Enter" && event.key !== " ")) return

    event.preventDefault()
    fileInputRef.current?.click()
  }

  const previewStyle: CSSProperties | undefined = previewArtwork && previewArtworkLayout && previewArtworkTranslation
    ? {
        backgroundColor: `color-mix(in oklab, color-mix(in oklab, var(--foreground), var(--color-theme-500) 45%) ${backgroundOpacity}%, transparent)`,
        height: previewArtworkLayout.height,
        left: previewArtworkLayout.left,
        top: previewArtworkLayout.top,
        width: previewArtworkLayout.width,
        transform: `translate(${previewArtworkTranslation.x}px, ${previewArtworkTranslation.y}px) rotate(${draftTransform.rotation}deg) scale(${draftTransform.scale})`,
        transformOrigin: "center",
        WebkitMask: `url("${previewArtwork}") right bottom / 100% 100% no-repeat`,
        mask: `url("${previewArtwork}") right bottom / 100% 100% no-repeat`,
      }
    : undefined
  const isProcessing = status?.kind === "progress"
  let previewContent: ReactNode
  if (isDragging) {
    previewContent = (
      <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium text-primary">
        Drop image to extract line art.
      </p>
    )
  } else if (previewStyle) {
    previewContent = <div ref={setArtworkElement} className="absolute" style={previewStyle} />
  } else if (!previewArtwork) {
    previewContent = (
      <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Drop an image here or choose one below.
      </p>
    )
  } else {
    previewContent = null
  }
  const hasTransformChanges = !areBackgroundArtworkTransformsEqual(draftTransform, savedTransform)
  const hasDraftChanges = draftArtwork !== null && draftArtwork !== savedArtwork
  const isDefaultTransform = areBackgroundArtworkTransformsEqual(
    draftTransform,
    DEFAULT_BACKGROUND_ARTWORK_TRANSFORM,
  )

  return (
    <SettingsSection
      title="Background artwork"
      description="Choose a photo and extract its edges locally into a quiet background illustration."
    >
      <div
        ref={setPreviewCanvasElement}
        role={previewArtwork ? "group" : "button"}
        tabIndex={0}
        aria-label={previewArtwork
          ? "Background artwork preview. Drag to reposition; use arrow keys for precise movement."
          : "Choose or drop an image to extract line art"}
        style={previewCanvasStyle}
        className={cn(
          "grid-texture-background relative mx-auto overflow-hidden rounded-2xl bg-background transition-[box-shadow] zenith-theme-400 focus-visible:ring-2 focus-visible:ring-primary",
          isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
        onClick={() => {
          if (!previewArtwork) fileInputRef.current?.click()
        }}
        onKeyDown={handlePreviewKeyDown}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = "copy"
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {previewContent}
        {previewArtwork && artworkElement && previewArtworkLayout && previewArtworkCenter && previewCanvasElement && !isDragging && (
          <Suspense fallback={null}>
            <BackgroundArtworkMoveable
              target={artworkElement}
              transform={{ ...draftTransform, ...previewArtworkCenter }}
              baseCenterX={previewArtworkLayout.left + previewArtworkLayout.width / 2}
              baseCenterY={previewArtworkLayout.top + previewArtworkLayout.height / 2}
              referenceWidth={previewCanvasSize.width}
              referenceHeight={previewCanvasSize.height}
              referenceElement={previewCanvasElement}
              onTransformChange={updateDraftTransform}
            />
          </Suspense>
        )}
        {sourceFile && (
          <div
            className="absolute bottom-3 left-3 z-10"
            onClick={event => event.stopPropagation()}
            onKeyDown={event => event.stopPropagation()}
          >
            <RadioGroup
              variant="segmented"
              aria-label="Background artwork output format"
              value={format}
              onValueChange={(value) => {
                if (value === "svg" || value === "webp") setFormat(value)
              }}
            >
              <RadioGroupItem value="svg">SVG</RadioGroupItem>
              <RadioGroupItem value="webp">WebP</RadioGroupItem>
            </RadioGroup>
          </div>
        )}
        {previewArtwork && !isDefaultTransform && (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="absolute top-3 right-3 z-10 bg-background/70 backdrop-blur"
            aria-label="Reset artwork placement"
            title="Reset artwork placement"
            onClick={(event) => {
              event.stopPropagation()
              replaceDraftTransform(DEFAULT_BACKGROUND_ARTWORK_TRANSFORM)
            }}
          >
            <PhArrowCounterClockwiseDuotone />
          </Button>
        )}
      </div>

      <Card variant="subtle">
        <CardContent>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4 text-sm">
                <label htmlFor="background-artwork-detail" className="font-medium">Edge detail</label>
                <span className="tabular-nums text-muted-foreground">{threshold}</span>
              </div>
              <Slider
                id="background-artwork-detail"
                aria-label="Edge detail"
                min={12}
                max={96}
                step={2}
                value={[threshold]}
                disabled={!sourceFile}
                onValueChange={(value) => {
                  const nextValue = Array.isArray(value) ? value[0] : value
                  if (nextValue !== undefined) setThreshold(nextValue)
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4 text-sm">
                <label htmlFor="background-artwork-opacity" className="font-medium">Opacity</label>
                <span className="tabular-nums text-muted-foreground">
                  {backgroundOpacity}
                  %
                </span>
              </div>
              <Slider
                id="background-artwork-opacity"
                aria-label="Background opacity"
                min={MIN_BACKGROUND_ARTWORK_OPACITY}
                max={MAX_BACKGROUND_ARTWORK_OPACITY}
                step={1}
                value={[backgroundOpacity]}
                onValueChange={(value) => {
                  const nextValue = Array.isArray(value) ? value[0] : value
                  if (nextValue !== undefined) setBackgroundOpacity(nextValue)
                }}
              />
            </div>

          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              Choose image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              size="sm"
              disabled={!previewArtwork || (!hasDraftChanges && !hasTransformChanges) || isProcessing}
              onClick={() => {
                setSavedArtwork(previewArtwork)
                setSavedTransform(draftTransform)
              }}
            >
              Apply background
            </Button>
            {savedArtwork && (
              <Button type="button" variant="destructive" size="sm" onClick={handleRemove}>
                Remove
              </Button>
            )}
          </div>

          {status && (
            <p
              role={status.kind === "error" ? "alert" : "status"}
              className={status.kind === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
            >
              {status.message}
            </p>
          )}
        </CardContent>
      </Card>
    </SettingsSection>
  )
}
