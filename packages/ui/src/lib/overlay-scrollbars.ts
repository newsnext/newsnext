import { OverlayScrollbars } from "overlayscrollbars"
import "../styles/overlay-scrollbars.css"

export function initOverlayScrollbars(element: HTMLElement): () => void {
  const style = getComputedStyle(element)
  const instance = OverlayScrollbars({
    target: element,
    // Keep refs, scroll restoration, and popup keyboard navigation on the same element.
    elements: { viewport: element },
  }, {
    overflow: {
      x: /auto|scroll/.test(style.overflowX) ? "scroll" : "hidden",
      y: /auto|scroll/.test(style.overflowY) ? "scroll" : "hidden",
    },
    scrollbars: {
      theme: "os-theme-newsnext",
      autoHide: "move",
      autoHideDelay: 800,
      clickScroll: "instant",
    },
  })

  return () => instance.destroy()
}
