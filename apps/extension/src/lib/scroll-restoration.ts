import { getBoardLayerFromState } from "@/lib/board"

export const ROOT_SCROLL_RESTORATION_ID = "app"

export const ROOT_SCROLL_RESTORATION_SELECTOR = `[data-scroll-restoration-id="${ROOT_SCROLL_RESTORATION_ID}"]`

interface ScrollRestorationLocation {
  href: string
  state: unknown
}

export function getBoardScrollRestorationKey(location: ScrollRestorationLocation): string {
  return `${location.href}:${getBoardLayerFromState(location.state) ?? "now"}`
}
