import type { BackgroundArtworkTransform } from "@/lib/background-artwork"
import { flushSync } from "react-dom"
import Moveable from "react-moveable"
import {
  MAX_BACKGROUND_ARTWORK_SCALE,
  MIN_BACKGROUND_ARTWORK_SCALE,
} from "@/lib/background-artwork"

interface BackgroundArtworkMoveableProps {
  baseCenterX: number
  baseCenterY: number
  onTransformChange: (update: Partial<BackgroundArtworkTransform>) => void
  referenceHeight: number
  referenceElement: HTMLDivElement
  referenceWidth: number
  target: HTMLDivElement
  transform: BackgroundArtworkTransform
}

export default function BackgroundArtworkMoveable({
  baseCenterX,
  baseCenterY,
  onTransformChange,
  referenceHeight,
  referenceElement,
  referenceWidth,
  target,
  transform,
}: BackgroundArtworkMoveableProps): React.JSX.Element {
  function resolveTranslation(): [number, number] {
    return [
      transform.x / 100 * referenceWidth - baseCenterX,
      transform.y / 100 * referenceHeight - baseCenterY,
    ]
  }

  function resolveTranslationUpdate(translation: number[]): Pick<BackgroundArtworkTransform, "x" | "y"> {
    const [x = 0, y = 0] = translation
    return {
      x: referenceWidth > 0 ? (baseCenterX + x) / referenceWidth * 100 : transform.x,
      y: referenceHeight > 0 ? (baseCenterY + y) / referenceHeight * 100 : transform.y,
    }
  }

  return (
    <Moveable
      target={target}
      className="background-artwork-moveable"
      useMutationObserver
      useResizeObserver
      draggable
      scalable
      rotatable
      pinchable
      snappable
      keepRatio
      origin={false}
      renderDirections={["nw", "ne", "sw", "se"]}
      rotationPosition="top"
      throttleRotate={1}
      snapContainer={referenceElement}
      snapDirections={{
        left: true,
        right: true,
        center: true,
        top: true,
        bottom: true,
        middle: true,
      }}
      verticalGuidelines={[0, referenceWidth / 2, referenceWidth]}
      horizontalGuidelines={[0, referenceHeight / 2, referenceHeight]}
      snapVerticalThreshold={6}
      snapHorizontalThreshold={6}
      snapRotationDegrees={[-180, -90, 0, 90, 180]}
      snapRotationThreshold={5}
      flushSync={flushSync}
      onDragStart={({ set }) => set(resolveTranslation())}
      onDrag={({ beforeTranslate }) => {
        onTransformChange(resolveTranslationUpdate(beforeTranslate))
      }}
      onScaleStart={({ dragStart, set, setMaxScaleSize, setMinScaleSize }) => {
        set([transform.scale, transform.scale])
        dragStart && dragStart.set(resolveTranslation())
        setMinScaleSize([
          target.offsetWidth * MIN_BACKGROUND_ARTWORK_SCALE,
          target.offsetHeight * MIN_BACKGROUND_ARTWORK_SCALE,
        ])
        setMaxScaleSize([
          target.offsetWidth * MAX_BACKGROUND_ARTWORK_SCALE,
          target.offsetHeight * MAX_BACKGROUND_ARTWORK_SCALE,
        ])
      }}
      onScale={({ drag, scale }) => {
        onTransformChange({
          ...resolveTranslationUpdate(drag.beforeTranslate),
          scale: scale[0] ?? transform.scale,
        })
      }}
      onRotateStart={({ dragStart, set }) => {
        set(transform.rotation)
        dragStart && dragStart.set(resolveTranslation())
      }}
      onRotate={({ drag, rotation }) => {
        onTransformChange({
          ...resolveTranslationUpdate(drag.beforeTranslate),
          rotation,
        })
      }}
    />
  )
}
