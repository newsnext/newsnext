export function canDragCardHeader(target: Element | null): boolean {
  return !target?.closest("[data-card-drag-excluded], button, a, input, select, textarea")
}

export function generateCardDragPreview({
  container,
  element,
}: { container: HTMLElement, element: HTMLElement }): (() => void) | undefined {
  const header = Array.from(element.querySelectorAll<HTMLElement>("[data-card-header]"))
    .find(candidate => !candidate.closest("[inert]"))
  const surface = element.querySelector<HTMLElement>("[data-card-surface]")
  if (!header || !surface) return

  const backgroundColor = getComputedStyle(element).getPropertyValue("--color-background").trim()
    || getComputedStyle(document.body).backgroundColor
  const previewWidth = element.getBoundingClientRect().width
  container.style.width = `${previewWidth}px`

  const layer = document.createElement("div")
  layer.className = "relative rounded-3xl shadow-md"
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
