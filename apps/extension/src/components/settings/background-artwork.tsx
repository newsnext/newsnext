import type { ChangeEvent, CSSProperties, DragEvent, KeyboardEvent, ReactNode } from "react"
import type { BackgroundArtworkFormat } from "@/lib/background-artwork"
import { Button } from "@newsnext/ui/components/button"
import { Card, CardContent } from "@newsnext/ui/components/card"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import { Slider } from "@newsnext/ui/components/slider"
import { useAtom } from "jotai"
import { useEffect, useRef, useState } from "react"
import {
  createBackgroundLineArt,
  DEFAULT_LINE_ART_THRESHOLD,
  MAX_BACKGROUND_ARTWORK_FILE_SIZE,
  MAX_BACKGROUND_ARTWORK_OPACITY,
  MIN_BACKGROUND_ARTWORK_OPACITY,
  releaseBackgroundArtworkSource,
} from "@/lib/background-artwork"
import { cn } from "@/lib/utils"
import { backgroundArtworkAtom, backgroundArtworkOpacityAtom } from "@/store/settings"
import { SettingsSection } from "./layout"

interface ProcessingStatus {
  kind: "error" | "progress"
  message: string
}

export function BackgroundArtworkSettings(): React.JSX.Element {
  const [savedArtwork, setSavedArtwork] = useAtom(backgroundArtworkAtom)
  const [backgroundOpacity, setBackgroundOpacity] = useAtom(backgroundArtworkOpacityAtom)
  const [draftArtwork, setDraftArtwork] = useState<string | null>(null)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [threshold, setThreshold] = useState(DEFAULT_LINE_ART_THRESHOLD)
  const [format, setFormat] = useState<BackgroundArtworkFormat>("svg")
  const [status, setStatus] = useState<ProcessingStatus | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const processingIdRef = useRef(0)

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

  function handlePreviewKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Enter" && event.key !== " ") return

    event.preventDefault()
    fileInputRef.current?.click()
  }

  function handleRemove(): void {
    processingIdRef.current += 1
    setSourceFile(null)
    setDraftArtwork(null)
    setSavedArtwork(null)
    setStatus(null)
  }

  const previewArtwork = draftArtwork ?? savedArtwork
  const previewStyle: CSSProperties | undefined = previewArtwork
    ? {
        backgroundColor: "color-mix(in oklab, var(--foreground), var(--color-theme-500) 45%)",
        WebkitMask: `url("${previewArtwork}") center / contain no-repeat`,
        mask: `url("${previewArtwork}") center / contain no-repeat`,
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
    previewContent = <div className="absolute inset-3 opacity-55" style={previewStyle} />
  } else {
    previewContent = (
      <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Drop an image here or choose one below.
      </p>
    )
  }

  return (
    <SettingsSection
      title="Background artwork"
      description="Choose a photo and extract its edges locally into a quiet background illustration."
    >
      <Card variant="subtle">
        <CardContent>
          <div
            role="button"
            tabIndex={0}
            aria-label="Choose or drop an image to extract line art"
            className={cn(
              "relative aspect-[8/3] overflow-hidden rounded-2xl bg-background/70 transition-[box-shadow] focus-visible:ring-2 focus-visible:ring-primary",
              isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
            onClick={() => fileInputRef.current?.click()}
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
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: "linear-gradient(to right, var(--background-grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--background-grid-line) 1px, transparent 1px)",
                backgroundSize: "24px 32px",
              }}
            />
            {previewContent}
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
          </div>

          <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
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
              disabled={!draftArtwork || draftArtwork === savedArtwork || isProcessing}
              onClick={() => setSavedArtwork(draftArtwork)}
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
