export function canDragCardHeader(target: Element | null): boolean {
  return !target?.closest("[data-live-card-drag-excluded], button, a, input, select, textarea")
}

export function generateLiveCardDragPreview({
  container,
  element,
}: { container: HTMLElement, element: HTMLElement }): (() => void) | undefined {
  const header = element.querySelector<HTMLElement>("[data-live-card-header]")
  const surface = element.querySelector<HTMLElement>("[data-live-card-surface]")
  if (!header || !surface) return

  const backgroundColor = getComputedStyle(element).getPropertyValue("--color-background").trim()
    || getComputedStyle(document.body).backgroundColor
  const previewWidth = element.getBoundingClientRect().width
  container.style.width = `${previewWidth}px`

  const layer = document.createElement("div")
  layer.dataset.dragPreview = ""
  layer.className = "relative rounded-3xl shadow-md"
  layer.style.width = `${previewWidth}px`
  layer.style.padding = "0.625rem"
  const surfaceColor = getComputedStyle(surface).backgroundColor
  layer.style.background = `linear-gradient(${surfaceColor}, ${surfaceColor}), ${backgroundColor}`
  layer.style.setProperty("--color-theme-400", getComputedStyle(header).getPropertyValue("--color-theme-400"))

  const preview = header.cloneNode(true) as HTMLElement
  preview.style.marginBottom = "0"
  layer.append(preview)
  container.append(layer)

  return () => layer.remove()
}
