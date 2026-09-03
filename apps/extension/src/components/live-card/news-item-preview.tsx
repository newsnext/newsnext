import type { AdvancedIframe } from "@newsnext/shared/types"
import type { CSSProperties, ReactNode } from "react"
import type { NewsItem } from "@/typings/source"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import { ProxiedImage } from "@newsnext/ui/components/proxied-image"
import { SafeHtml } from "@newsnext/ui/components/safe-html"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ExternalLink, X } from "lucide-react"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"
import { NewsItemInline } from "./news-item-inline"

interface NewsItemPreviewProps {
  item: NewsItem
  pictureIndex: number
  onPictureIndexChange: (index: number) => void
  onOpen: () => void
}

function getPictures(item: NewsItem): string[] {
  const pictures = item.content?.pictures
  if (!pictures) return []
  return Array.isArray(pictures) ? pictures : [pictures]
}

function hasTextSelection(): boolean {
  return window.getSelection()?.isCollapsed === false
}

export function NewsItemPreview({
  item,
  pictureIndex,
  onPictureIndexChange,
  onOpen,
}: NewsItemPreviewProps): ReactNode {
  const { content } = item
  const pictures = getPictures(item)
  const hasOpenTarget = pictures.length > 0 || Boolean(content?.html || content?.text)

  return (
    <div className="flex flex-col gap-2 select-text">
      {pictures.length > 0 && (
        <NewsItemPictureCarousel
          pictures={pictures}
          title={item.title}
          index={pictureIndex}
          onIndexChange={onPictureIndexChange}
          onPictureOpen={onOpen}
        />
      )}
      {content?.iframe && <NewsItemPreviewIframe iframe={content.iframe} />}
      {content?.html
        ? (
            <div
              role="button"
              tabIndex={0}
              className="cursor-zoom-in rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-theme-400"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) return
                if (hasTextSelection()) return
                onOpen()
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return
                event.preventDefault()
                onOpen()
              }}
            >
              <SafeHtml
                as="div"
                className="whitespace-pre-wrap wrap-break-word"
                html={content.html}
              />
            </div>
          )
        : content?.text && (
          <button
            type="button"
            className="cursor-zoom-in whitespace-pre-wrap wrap-break-word rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-theme-400"
            onClick={() => {
              if (!hasTextSelection()) onOpen()
            }}
          >
            {content.text}
          </button>
        )}
      {!hasOpenTarget && (
        <button
          type="button"
          className="cursor-zoom-in wrap-break-word rounded-lg text-left text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-theme-400"
          onClick={() => {
            if (!hasTextSelection()) onOpen()
          }}
        >
          {item.title}
        </button>
      )}
    </div>
  )
}

interface NewsItemPictureCarouselProps {
  pictures: string[]
  title: string
  expanded?: boolean
  index: number
  onIndexChange: (index: number) => void
  onPictureOpen?: () => void
}

function NewsItemPictureCarousel({
  pictures,
  title,
  expanded = false,
  index: requestedIndex,
  onIndexChange,
  onPictureOpen,
}: NewsItemPictureCarouselProps): ReactNode {
  const { t } = useI18n()
  const index = Math.min(requestedIndex, pictures.length - 1)
  const hasMultiplePictures = pictures.length > 1
  const picture = pictures[index]
  if (!picture) return null

  const setIndex = (nextIndex: number): void => {
    const wrappedIndex = (nextIndex + pictures.length) % pictures.length
    onIndexChange(wrappedIndex)
  }

  const previous = (): void => setIndex(index - 1)
  const next = (): void => setIndex(index + 1)

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        expanded
          ? "size-full"
          : "aspect-video w-full bg-black/5 dark:bg-white/5",
      )}
      onKeyDown={(event) => {
        if (!hasMultiplePictures) return
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          previous()
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          next()
        }
      }}
    >
      {onPictureOpen
        ? (
            <button
              type="button"
              className="size-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-400"
              aria-label={t("viewImage")}
              onClick={onPictureOpen}
            >
              <ProxiedImage
                src={picture}
                alt={title}
                loading="eager"
                className="size-full object-contain"
              />
            </button>
          )
        : (
            <ProxiedImage
              src={picture}
              alt={title}
              loading="eager"
              className="max-h-full max-w-full object-contain"
            />
          )}
      {hasMultiplePictures && (
        <>
          <PictureNavigationButton direction="previous" label={t("previousImage")} onClick={previous} />
          <PictureNavigationButton direction="next" label={t("nextImage")} onClick={next} />
          <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-xs tabular-nums text-white">
            {index + 1}
            /
            {pictures.length}
          </span>
        </>
      )}
    </div>
  )
}

function PictureNavigationButton({
  direction,
  label,
  onClick,
}: {
  direction: "next" | "previous"
  label: string
  onClick: () => void
}): ReactNode {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-80 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-white",
        direction === "previous" ? "left-2" : "right-2",
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}

interface NewsItemPreviewDialogProps {
  item: NewsItem
  open: boolean
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  inlineText?: string
  inlineSuffix?: ReactNode
  markScale?: number
  onPreviousItem?: () => void
  onNextItem?: () => void
}

export function NewsItemPreviewDialog({
  item,
  open,
  index,
  onIndexChange,
  onClose,
  inlineText,
  inlineSuffix,
  markScale,
  onPreviousItem,
  onNextItem,
}: NewsItemPreviewDialogProps): ReactNode {
  const { t } = useI18n()
  const pictures = getPictures(item)
  const { content } = item

  const hasMedia = pictures.length > 0 || Boolean(content?.iframe)
  const hasBody = Boolean(content?.html || content?.text)

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        variant="bare"
        className="h-[calc(100dvh-3rem)] w-[calc(100%-3rem)] sm:max-w-6xl lg:w-[calc(100%-11rem)]"
        surfaceClassName="overflow-hidden bg-background shadow-2xl"
      >
        <div
          className={cn(
            "grid size-full min-h-0",
            hasMedia && "grid-rows-[42dvh_minmax(0,1fr)] lg:grid-cols-[minmax(0,3fr)_minmax(22rem,2fr)] lg:grid-rows-1",
          )}
        >
          {hasMedia && (
            <div className="min-h-0 lg:h-full">
              {pictures.length > 0
                ? (
                    <NewsItemPictureCarousel
                      expanded
                      pictures={pictures}
                      title={item.title}
                      index={index}
                      onIndexChange={onIndexChange}
                    />
                  )
                : content?.iframe && (
                  <div className="flex size-full items-center">
                    <NewsItemPreviewIframe iframe={content.iframe} expanded />
                  </div>
                )}
            </div>
          )}
          <section className={cn(
            "flex min-h-0 flex-col select-text",
            hasMedia && "border-t border-border/60 lg:border-t-0 lg:border-l",
          )}
          >
            <header className="flex h-18 shrink-0 items-center px-4">
              <div className={cn("flex w-full items-center", !hasMedia && "mx-auto max-w-3xl")}>
                {item.icon && (
                  <ProxiedImage
                    src={item.icon.src}
                    alt={item.icon.label ?? ""}
                    className={cn(
                      "max-h-8 max-w-28 object-contain",
                      item.icon.kind === "author" && "size-8 rounded-full object-cover",
                    )}
                  />
                )}
              </div>
            </header>
            <article className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
              <div className={cn(!hasMedia && "mx-auto w-full max-w-3xl")}>
                <DialogTitle className={cn(
                  "text-justify font-semibold tracking-tight",
                  hasMedia ? "text-lg leading-7" : "text-xl leading-8",
                )}
                >
                  {item.title}
                </DialogTitle>
                {hasBody && (
                  <div className="mt-4 text-justify text-base leading-8 text-foreground/90 [&_a]:underline [&_a]:underline-offset-3 [&_p]:mb-4 [&_p:last-child]:mb-0">
                    {content?.html
                      ? (
                          <SafeHtml
                            as="div"
                            className="whitespace-pre-wrap wrap-break-word"
                            html={content.html}
                          />
                        )
                      : <p className="whitespace-pre-wrap wrap-break-word">{content?.text}</p>}
                  </div>
                )}
              </div>
            </article>
            <footer className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-t border-border/60 py-4 pr-4 pl-6">
              <NewsItemInline
                item={item}
                inlineText={inlineText}
                inlineSuffix={inlineSuffix}
                markScale={markScale}
                truncate={false}
                size="large"
                className="min-w-0 flex-1 flex-wrap gap-2"
              />
              <div className="ml-auto flex shrink-0 items-center gap-1">
                {(onPreviousItem || onNextItem) && (
                  <>
                    <ItemNavigationButton
                      direction="previous"
                      label={t("previousItem")}
                      onClick={onPreviousItem}
                    />
                    <ItemNavigationButton
                      direction="next"
                      label={t("nextItem")}
                      onClick={onNextItem}
                    />
                  </>
                )}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("openOriginal")}
                  title={t("openOriginal")}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-theme-400"
                >
                  <ExternalLink className="size-5" />
                </a>
              </div>
            </footer>
          </section>
        </div>
        <DialogClose
          aria-label={t("close")}
          className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/60 text-white opacity-80 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="size-5" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

function ItemNavigationButton({ direction, label, onClick }: {
  direction: "next" | "previous"
  label: string
  onClick?: () => void
}): ReactNode {
  const Icon = direction === "previous" ? ChevronUp : ChevronDown
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={!onClick}
      onClick={onClick}
      className="flex size-9 shrink-0 items-center justify-center rounded-full outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-theme-400 disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon className="size-5" />
    </button>
  )
}

function NewsItemPreviewIframe({ iframe, expanded = false }: { iframe: AdvancedIframe | string, expanded?: boolean }) {
  const props: AdvancedIframe = typeof iframe === "string" ? { src: iframe } : { ...iframe }
  delete props.blocked
  delete props.selector
  if (!props.src) return null

  const {
    aspectRatio = 16 / 9,
    className,
    height,
    loading,
    sandbox,
    style,
    title,
    width,
    ...rest
  } = props
  const useAspectRatio = height == null && style?.height == null && aspectRatio > 0
  const iframeStyle: CSSProperties | undefined = useAspectRatio
    ? { ...style, aspectRatio, height: "auto" }
    : style

  return (
    <iframe
      {...rest}
      src={props.src}
      width={width ?? "100%"}
      height={height ?? (useAspectRatio ? undefined : "320")}
      style={iframeStyle}
      className={cn("w-full", expanded && "max-h-full", className)}
      loading={loading ?? "lazy"}
      sandbox={sandbox ?? "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"}
      title={title ?? "News item preview"}
    />
  )
}
