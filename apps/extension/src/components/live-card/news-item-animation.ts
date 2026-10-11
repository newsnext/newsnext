export function getTitleStartRect(title: HTMLElement): DOMRect {
  const range = document.createRange()
  range.selectNodeContents(title)
  return range.getClientRects()[0] ?? title.getBoundingClientRect()
}

export function animateNewsItemReturn(content: HTMLElement, origin: DOMRect): Animation[] {
  const title = content.querySelector<HTMLElement>("[data-news-item-title]")
  if (!title) return []

  const bounds = content.getBoundingClientRect()
  const titleBounds = getTitleStartRect(title)
  const deltaX = origin.left - titleBounds.left
  const deltaY = origin.top - titleBounds.top
  const ratio = 96 / Math.max(96, Math.hypot(deltaX, deltaY))
  const transformOrigin = `${titleBounds.left - bounds.left}px ${titleBounds.top - bounds.top}px`

  // Preview text-lg / item text-base = 1.125. Fade in before movement settles.
  return [
    content.animate([
      { transform: `translate(${deltaX * ratio}px, ${deltaY * ratio}px) scale(1.125)`, transformOrigin },
      { transform: "translate(0, 0) scale(1)", transformOrigin },
    ], { duration: 240, easing: "cubic-bezier(0.16, 0.85, 0.3, 1)" }),
    content.animate([
      { opacity: 0 },
      { opacity: 1 },
    ], { duration: 80, easing: "ease-out" }),
  ]
}
