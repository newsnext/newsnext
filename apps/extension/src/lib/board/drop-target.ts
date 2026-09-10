import type { ElementEventBasePayload } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"

export function isDropWithin({ location }: Pick<ElementEventBasePayload, "location">, element: HTMLElement | null): boolean {
  if (!element || !location.current.dropTargets.some(target => target.element === element)) return false
  const { clientX, clientY } = location.current.input
  const bounds = element.getBoundingClientRect()
  return clientX >= bounds.left && clientX <= bounds.right
    && clientY >= bounds.top && clientY <= bounds.bottom
}
