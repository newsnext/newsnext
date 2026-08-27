import type { ChangeEvent, CSSProperties, DragEvent, ReactNode } from "react"
import type { BgIllustrationTransform } from "@/lib/bg-illustration"
import type { Board } from "@/lib/board"
import { Button } from "@newsnext/ui/components/button"
import { Card, CardContent } from "@newsnext/ui/components/card"
import { Slider } from "@newsnext/ui/components/slider"
import { SquircleBox } from "@newsnext/ui/components/squircle"
import { useEffect, useRef, useState } from "react"
import { ConfigSection } from "@/components/common/config-section"
import { ConfirmDestructiveButton } from "@/components/common/confirm-destructive-button"
import { PhArrowCounterClockwise } from "@/components/icons/ph"
import { useBgIllustration } from "@/hooks/use-bg-illustration"
import { actions } from "@/lib/actions"
import {
  areBgIllustrationTransformsEqual,
  createBgIllustrationFromImage,
  createBgIllustrationFromSvg,
  DEFAULT_BG_ILLUSTRATION_OPACITY,
  DEFAULT_BG_ILLUSTRATION_TRANSFORM,
  DEFAULT_LINE_ART_THRESHOLD,
  isSvgIllustrationFile,
  loadBgIllustrationAspectRatio,
  MAX_BG_ILLUSTRATION_FILE_SIZE,
  MAX_BG_ILLUSTRATION_OPACITY,
  MIN_BG_ILLUSTRATION_OPACITY,
  normalizeBgIllustrationTransform,
  releaseBgIllustrationSource,
  resolveBgIllustrationCenter,
  resolveBgIllustrationLayout,
  resolveBgIllustrationTranslation,
} from "@/lib/bg-illustration"
import { cn } from "@/lib/utils"
import BgIllustrationControls from "./bg-illustration-controls"

interface ProcessingStatus {
  kind: "error" | "progress"
  message: string
}

interface PreviewCanvasStyle extends CSSProperties {
  "--background-grid-size": string
}

interface TransformDraft {
  baseline: BgIllustrationTransform
  value: BgIllustrationTransform
}

interface IllustrationAspectRatioState {
  illustration: string
  value: number
}

interface ViewportSize {
  height: number
  width: number
}

export function BgIllustrationSettings({
  board,
}: {
  board: Board
}): React.JSX.Element {
  const resetKey = `${board.id}:${JSON.stringify(board.illustration)}`
  return <BgIllustrationSettingsContent key={resetKey} board={board} />
}

function BgIllustrationSettingsContent({
  board,
}: {
  board: Board
}): React.JSX.Element {
  const savedConfiguration = board.illustration
  const savedIllustration = useBgIllustration(savedConfiguration?.id)
  const savedTransform = savedConfiguration?.transform ?? DEFAULT_BG_ILLUSTRATION_TRANSFORM
  const [illustrationOpacity, setIllustrationOpacity] = useState(
    () => savedConfiguration?.opacity ?? DEFAULT_BG_ILLUSTRATION_OPACITY,
  )
  const [draftIllustration, setDraftIllustration] = useState<string | null>(null)
  const [transformDraft, setTransformDraft] = useState<TransformDraft>(() => ({
    baseline: savedTransform,
    value: savedTransform,
  }))
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [threshold, setThreshold] = useState(DEFAULT_LINE_ART_THRESHOLD)
  const [status, setStatus] = useState<ProcessingStatus | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [illustrationElement, setIllustrationElement] = useState<HTMLDivElement | null>(null)
  const [previewCanvasElement, setPreviewCanvasElement] = useState<HTMLDivElement | null>(null)
  const [previewCanvasSize, setPreviewCanvasSize] = useState<ViewportSize>({ height: 0, width: 0 })
  const [illustrationAspectRatioState, setIllustrationAspectRatioState] = useState<IllustrationAspectRatioState | null>(null)
  const [viewportSize, setViewportSize] = useState<ViewportSize>(() => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }))
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processingIdRef = useRef(0)
  const draftTransform = areBgIllustrationTransformsEqual(transformDraft.baseline, savedTransform)
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
      void createBgIllustrationFromImage(sourceFile, threshold).then((illustration) => {
        if (processingIdRef.current !== processingId) return
        setDraftIllustration(illustration)
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
  }, [sourceFile, threshold])

  useEffect(() => {
    if (!sourceFile) return
    return () => releaseBgIllustrationSource(sourceFile)
  }, [sourceFile])

  const previewIllustration = draftIllustration ?? savedIllustration

  useEffect(() => {
    if (!previewIllustration) return

    let cancelled = false
    void loadBgIllustrationAspectRatio(previewIllustration).then((value) => {
      if (!cancelled) setIllustrationAspectRatioState({ illustration: previewIllustration, value })
    }).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [previewIllustration])

  function selectFile(file: File): void {
    const isSvg = isSvgIllustrationFile(file)
    if (!file.type.startsWith("image/") && !isSvg) {
      setStatus({ kind: "error", message: "Choose an image or SVG file." })
      return
    }
    if (file.size > MAX_BG_ILLUSTRATION_FILE_SIZE) {
      setStatus({ kind: "error", message: "Choose a file smaller than 12 MB." })
      return
    }

    const selectionId = processingIdRef.current + 1
    processingIdRef.current = selectionId
    setDraftIllustration(null)
    replaceDraftTransform(DEFAULT_BG_ILLUSTRATION_TRANSFORM)
    if (isSvg) {
      setSourceFile(null)
      setStatus({ kind: "progress", message: "Preparing SVG…" })
      void createBgIllustrationFromSvg(file).then((illustration) => {
        if (processingIdRef.current !== selectionId) return
        setDraftIllustration(illustration)
        setStatus(null)
      }).catch((error: unknown) => {
        if (processingIdRef.current !== selectionId) return
        setStatus({
          kind: "error",
          message: error instanceof Error ? error.message : "The SVG could not be processed.",
        })
      })
      return
    }

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

  function updateDraftTransform(update: Partial<BgIllustrationTransform>): void {
    setTransformDraft((current) => {
      const currentValue = areBgIllustrationTransformsEqual(current.baseline, savedTransform)
        ? current.value
        : savedTransform
      return {
        baseline: savedTransform,
        value: normalizeBgIllustrationTransform({
          ...currentValue,
          ...update,
          positionMode: "viewport-center",
        }),
      }
    })
  }

  function replaceDraftTransform(value: BgIllustrationTransform): void {
    setTransformDraft({
      baseline: savedTransform,
      value: { ...value },
    })
  }

  async function handleRemove(): Promise<void> {
    processingIdRef.current += 1
    setStatus({ kind: "progress", message: "Removing background…" })
    try {
      await actions.illustration.remove({ boardId: board.id })
      setSourceFile(null)
      setDraftIllustration(null)
      replaceDraftTransform(DEFAULT_BG_ILLUSTRATION_TRANSFORM)
      setIllustrationOpacity(DEFAULT_BG_ILLUSTRATION_OPACITY)
      setStatus(null)
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "The background could not be removed.",
      })
    }
  }

  async function handleApply(): Promise<void> {
    if (!previewIllustration) return
    setStatus({ kind: "progress", message: "Saving background…" })
    try {
      await actions.illustration.apply({
        boardId: board.id,
        illustration: previewIllustration,
        opacity: illustrationOpacity,
        transform: draftTransform,
      })
      setStatus(null)
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "The background could not be saved.",
      })
    }
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
  const illustrationAspectRatio = illustrationAspectRatioState?.illustration === previewIllustration
    ? illustrationAspectRatioState.value
    : null
  const illustrationLayout = illustrationAspectRatio === null || previewCanvasSize.width === 0
    ? null
    : resolveBgIllustrationLayout(viewportWidth, viewportHeight, illustrationAspectRatio)
  const previewScale = previewCanvasSize.width / viewportWidth
  const previewIllustrationLayout = illustrationLayout
    ? {
        height: illustrationLayout.height * previewScale,
        left: illustrationLayout.left * previewScale,
        top: illustrationLayout.top * previewScale,
        width: illustrationLayout.width * previewScale,
      }
    : null
  const previewIllustrationCenter = previewIllustrationLayout
    ? resolveBgIllustrationCenter(
        previewIllustrationLayout,
        previewCanvasSize.height,
        draftTransform,
      )
    : null
  const previewIllustrationTranslation = previewIllustrationLayout && previewIllustrationCenter
    ? resolveBgIllustrationTranslation(
        previewIllustrationLayout,
        previewCanvasSize.width,
        previewCanvasSize.height,
        previewIllustrationCenter.x,
        previewIllustrationCenter.y,
      )
    : null

  const previewStyle: CSSProperties | undefined = previewIllustration && previewIllustrationLayout && previewIllustrationTranslation
    ? {
        backgroundColor: `color-mix(in oklab, color-mix(in oklab, var(--foreground), var(--primary) 45%) ${illustrationOpacity}%, transparent)`,
        height: previewIllustrationLayout.height,
        left: previewIllustrationLayout.left,
        top: previewIllustrationLayout.top,
        width: previewIllustrationLayout.width,
        transform: `translate(${previewIllustrationTranslation.x}px, ${previewIllustrationTranslation.y}px) rotate(${draftTransform.rotation}deg) scale(${draftTransform.scale})`,
        transformOrigin: "center",
        WebkitMask: `url("${previewIllustration}") right bottom / 100% 100% no-repeat`,
        mask: `url("${previewIllustration}") right bottom / 100% 100% no-repeat`,
      }
    : undefined
  const isProcessing = status?.kind === "progress"
  let previewContent: ReactNode
  if (isDragging) {
    previewContent = (
      <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-medium text-primary">
        Drop an image or SVG here.
      </p>
    )
  } else if (previewStyle) {
    previewContent = <div ref={setIllustrationElement} className="absolute" style={previewStyle} />
  } else if (!previewIllustration) {
    previewContent = (
      <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Drop an image or SVG here, or choose one below.
      </p>
    )
  } else {
    previewContent = null
  }
  const hasTransformChanges = !areBgIllustrationTransformsEqual(draftTransform, savedTransform)
  const hasDraftChanges = draftIllustration !== null && draftIllustration !== savedIllustration
  const hasOpacityChanges = illustrationOpacity !== (savedConfiguration?.opacity ?? DEFAULT_BG_ILLUSTRATION_OPACITY)
  const isDefaultTransform = areBgIllustrationTransformsEqual(
    draftTransform,
    DEFAULT_BG_ILLUSTRATION_TRANSFORM,
  )

  return (
    <ConfigSection
      title="Background illustration"
      description="Choose a separate background illustration for the current Board."
      surface={false}
    >
      <SquircleBox
        radius="2xl"
        ref={setPreviewCanvasElement}
        role="group"
        aria-label={previewIllustration
          ? "Background illustration preview. Drag to reposition."
          : "Choose or drop an image or SVG for background illustration"}
        style={previewCanvasStyle}
        className={cn(
          "grid-texture-background relative mx-auto bg-background transition-[box-shadow] zenith-theme-400",
          isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
        onClick={() => {
          if (!previewIllustration) fileInputRef.current?.click()
        }}
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
        {previewIllustration && illustrationElement && previewIllustrationLayout && previewIllustrationCenter && previewCanvasElement && !isDragging && (
          <BgIllustrationControls
            target={illustrationElement}
            transform={{ ...draftTransform, ...previewIllustrationCenter }}
            baseCenterX={previewIllustrationLayout.left + previewIllustrationLayout.width / 2}
            baseCenterY={previewIllustrationLayout.top + previewIllustrationLayout.height / 2}
            referenceWidth={previewCanvasSize.width}
            referenceHeight={previewCanvasSize.height}
            referenceElement={previewCanvasElement}
            onTransformChange={updateDraftTransform}
          />
        )}
        {previewIllustration && !isDefaultTransform && (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="absolute top-3 right-3 z-10 bg-background/70 backdrop-blur"
            aria-label="Reset illustration placement"
            title="Reset illustration placement"
            onClick={(event) => {
              event.stopPropagation()
              replaceDraftTransform(DEFAULT_BG_ILLUSTRATION_TRANSFORM)
            }}
          >
            <PhArrowCounterClockwise />
          </Button>
        )}
        {status && (
          <p
            role={status.kind === "error" ? "alert" : "status"}
            className={cn(
              "absolute bottom-3 left-3 z-10 max-w-[calc(100%_-_1.5rem)] rounded-lg bg-background/85 px-3 py-2 text-left text-sm shadow-sm backdrop-blur",
              status.kind === "error" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {status.message}
          </p>
        )}
      </SquircleBox>

      <Card variant="subtle">
        <CardContent>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <ConfigSection
              variant="field"
              title="Edge detail"
              htmlFor="bg-illustration-detail"
              surface={false}
              titleAccessory={<span className="tabular-nums text-muted-foreground">{threshold}</span>}
            >
              <Slider
                id="bg-illustration-detail"
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
            </ConfigSection>

            <ConfigSection
              variant="field"
              title="Opacity"
              htmlFor="bg-illustration-opacity"
              surface={false}
              titleAccessory={(
                <span className="tabular-nums text-muted-foreground">
                  {illustrationOpacity}
                  %
                </span>
              )}
            >
              <Slider
                id="bg-illustration-opacity"
                aria-label="Illustration opacity"
                min={MIN_BG_ILLUSTRATION_OPACITY}
                max={MAX_BG_ILLUSTRATION_OPACITY}
                step={1}
                value={[illustrationOpacity]}
                onValueChange={(value) => {
                  const nextValue = Array.isArray(value) ? value[0] : value
                  if (nextValue !== undefined) setIllustrationOpacity(nextValue)
                }}
              />
            </ConfigSection>

          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              Choose image or SVG
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.svg,image/svg+xml"
              className="sr-only"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              size="sm"
              disabled={!previewIllustration || (!hasDraftChanges && !hasTransformChanges && !hasOpacityChanges) || isProcessing}
              onClick={() => void handleApply()}
            >
              Apply background
            </Button>
            {savedConfiguration && (
              <ConfirmDestructiveButton
                type="button"
                size="sm"
                label="Remove"
                confirmLabel="Confirm remove"
                onConfirm={handleRemove}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </ConfigSection>
  )
}
