import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react"
import type { BgIllustrationTransform } from "@/lib/bg-illustration"
import { useRef, useState } from "react"
import { PhArrowCounterClockwise } from "@/components/icons/ph"
import {
  MAX_BG_ILLUSTRATION_SCALE,
  MIN_BG_ILLUSTRATION_SCALE,
} from "@/lib/bg-illustration"

const POSITION_SNAP_THRESHOLD = 6
const ROTATION_SNAP_THRESHOLD = 5
const ROTATION_SNAP_POINTS = [-180, -90, 0, 90, 180] as const
const SCALE_HANDLES = [
  { cursor: "cursor-nwse-resize", position: "-left-1.5 -top-1.5" },
  { cursor: "cursor-nesw-resize", position: "-right-1.5 -top-1.5" },
  { cursor: "cursor-nesw-resize", position: "-bottom-1.5 -left-1.5" },
  { cursor: "cursor-nwse-resize", position: "-bottom-1.5 -right-1.5" },
] as const

interface BgIllustrationControlsProps {
  baseCenterX: number
  baseCenterY: number
  onTransformChange: (update: Partial<BgIllustrationTransform>) => void
  referenceHeight: number
  referenceElement: HTMLDivElement
  referenceWidth: number
  target: HTMLDivElement
  transform: BgIllustrationTransform
}

interface ActiveInteraction {
  centerClientX: number
  centerClientY: number
  kind: "drag" | "rotate" | "scale"
  pointerId: number
  startAngle: number
  startClientX: number
  startClientY: number
  startDistance: number
  startRotation: number
  startScale: number
  startX: number
  startY: number
}

interface SnapGuides {
  x: number | null
  y: number | null
}

interface ControlsStyle extends CSSProperties {
  touchAction: "none"
}

export default function BgIllustrationControls({
  baseCenterX,
  baseCenterY,
  onTransformChange,
  referenceHeight,
  referenceElement,
  referenceWidth,
  target,
  transform,
}: BgIllustrationControlsProps): React.JSX.Element {
  const interactionRef = useRef<ActiveInteraction | null>(null)
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction["kind"] | null>(null)
  const [snapGuides, setSnapGuides] = useState<SnapGuides>({ x: null, y: null })
  const translationX = transform.x / 100 * referenceWidth - baseCenterX
  const translationY = transform.y / 100 * referenceHeight - baseCenterY
  const controlsStyle: ControlsStyle = {
    height: target.offsetHeight * transform.scale,
    left: target.offsetLeft + translationX + target.offsetWidth * (1 - transform.scale) / 2,
    top: target.offsetTop + translationY + target.offsetHeight * (1 - transform.scale) / 2,
    touchAction: "none",
    transform: `rotate(${transform.rotation}deg)`,
    transformOrigin: "center",
    width: target.offsetWidth * transform.scale,
  }

  function startInteraction(
    event: ReactPointerEvent<HTMLElement>,
    kind: ActiveInteraction["kind"],
  ): void {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setActiveInteraction(kind)
    const referenceRect = referenceElement.getBoundingClientRect()
    const centerClientX = referenceRect.left + transform.x / 100 * referenceWidth
    const centerClientY = referenceRect.top + transform.y / 100 * referenceHeight
    interactionRef.current = {
      centerClientX,
      centerClientY,
      kind,
      pointerId: event.pointerId,
      startAngle: Math.atan2(event.clientY - centerClientY, event.clientX - centerClientX) * 180 / Math.PI,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startDistance: Math.hypot(event.clientX - centerClientX, event.clientY - centerClientY),
      startRotation: transform.rotation,
      startScale: transform.scale,
      startX: transform.x,
      startY: transform.y,
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>): void {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    event.stopPropagation()

    if (interaction.kind === "drag") {
      const centerX = interaction.startX / 100 * referenceWidth + event.clientX - interaction.startClientX
      const centerY = interaction.startY / 100 * referenceHeight + event.clientY - interaction.startClientY
      const radians = transform.rotation * Math.PI / 180
      const cosine = Math.abs(Math.cos(radians))
      const sine = Math.abs(Math.sin(radians))
      const scaledWidth = target.offsetWidth * transform.scale
      const scaledHeight = target.offsetHeight * transform.scale
      const snappedX = snapPosition(
        centerX,
        referenceWidth,
        (scaledWidth * cosine + scaledHeight * sine) / 2,
      )
      const snappedY = snapPosition(
        centerY,
        referenceHeight,
        (scaledWidth * sine + scaledHeight * cosine) / 2,
      )
      setSnapGuides({ x: snappedX.guide, y: snappedY.guide })
      onTransformChange({
        x: referenceWidth > 0 ? snappedX.value / referenceWidth * 100 : transform.x,
        y: referenceHeight > 0 ? snappedY.value / referenceHeight * 100 : transform.y,
      })
      return
    }

    if (interaction.kind === "scale") {
      const distance = Math.hypot(
        event.clientX - interaction.centerClientX,
        event.clientY - interaction.centerClientY,
      )
      const ratio = interaction.startDistance > 0 ? distance / interaction.startDistance : 1
      onTransformChange({
        scale: clamp(
          interaction.startScale * ratio,
          MIN_BG_ILLUSTRATION_SCALE,
          MAX_BG_ILLUSTRATION_SCALE,
        ),
        x: interaction.startX,
        y: interaction.startY,
      })
      return
    }

    const angle = Math.atan2(
      event.clientY - interaction.centerClientY,
      event.clientX - interaction.centerClientX,
    ) * 180 / Math.PI
    onTransformChange({
      rotation: snapRotation(normalizeRotation(interaction.startRotation + angle - interaction.startAngle)),
      x: interaction.startX,
      y: interaction.startY,
    })
  }

  function finishInteraction(event: ReactPointerEvent<HTMLElement>): void {
    if (interactionRef.current?.pointerId !== event.pointerId) return
    event.stopPropagation()
    interactionRef.current = null
    setActiveInteraction(null)
    setSnapGuides({ x: null, y: null })
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const interactionHandlers = {
    onPointerCancel: finishInteraction,
    onPointerMove: handlePointerMove,
    onPointerUp: finishInteraction,
  }

  return (
    <>
      {snapGuides.x !== null && (
        <div
          className="pointer-events-none absolute inset-y-0 z-20 w-px bg-primary/70"
          style={{ left: snapGuides.x }}
        />
      )}
      {snapGuides.y !== null && (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 h-px bg-primary/70"
          style={{ top: snapGuides.y }}
        />
      )}
      <div
        className="absolute z-10 cursor-move border border-primary"
        style={controlsStyle}
        onPointerDown={event => startInteraction(event, "drag")}
        {...interactionHandlers}
      >
        {SCALE_HANDLES.map(handle => (
          <button
            key={handle.position}
            type="button"
            tabIndex={-1}
            aria-label="Scale illustration"
            className={`absolute size-3 rounded-full border border-primary bg-background ${handle.cursor} ${handle.position}`}
            onPointerDown={event => startInteraction(event, "scale")}
            {...interactionHandlers}
          />
        ))}
        <div className="absolute -top-6 left-1/2 h-6 w-px -translate-x-1/2 bg-primary" />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Rotate illustration"
          className={`absolute -top-9 left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full border border-primary bg-background text-primary ${activeInteraction === "rotate" ? "cursor-grabbing" : "cursor-grab"}`}
          onPointerDown={event => startInteraction(event, "rotate")}
          {...interactionHandlers}
        >
          <PhArrowCounterClockwise className="size-3.5" />
        </button>
      </div>
    </>
  )
}

function snapPosition(
  center: number,
  referenceSize: number,
  halfExtent: number,
): { guide: number | null, value: number } {
  const guidelines = [0, referenceSize / 2, referenceSize]
  let closest = { distance: Number.POSITIVE_INFINITY, guide: null as number | null, value: center }
  for (const guide of guidelines) {
    for (const candidate of [guide - halfExtent, guide, guide + halfExtent]) {
      const distance = Math.abs(candidate - center)
      if (distance < closest.distance) closest = { distance, guide, value: candidate }
    }
  }
  return closest.distance <= POSITION_SNAP_THRESHOLD
    ? { guide: closest.guide, value: closest.value }
    : { guide: null, value: center }
}

function snapRotation(rotation: number): number {
  const closest = ROTATION_SNAP_POINTS.reduce((current, point) => (
    Math.abs(point - rotation) < Math.abs(current - rotation) ? point : current
  ))
  return Math.abs(closest - rotation) <= ROTATION_SNAP_THRESHOLD ? closest : rotation
}

function normalizeRotation(rotation: number): number {
  return ((rotation + 180) % 360 + 360) % 360 - 180
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
