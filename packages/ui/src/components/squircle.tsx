import type * as React from "react"
import { getSvgPath } from "@newsnext/ui/lib/figma-squircle"
import { cn } from "@newsnext/ui/lib/utils"
import { useCallback, useMemo, useState } from "react"

/*
 * The React sizing behavior is adapted from @squircle-js/react 1.3.0.
 *
 * MIT License
 * Copyright (c) 2023 Antoni Silvestrovič
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

type SquircleRadius = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full"
type SquircleVariant = "default" | "modal-shell" | "modal-inner"

const squircleRadiusValues = {
  "sm": 4,
  "md": 6,
  "lg": 8,
  "xl": 12,
  "2xl": 16,
  "3xl": 24,
  "4xl": 32,
  "full": 9999,
} satisfies Record<SquircleRadius, number>

interface SquircleBoxProps extends React.ComponentPropsWithoutRef<"div"> {
  radius?: SquircleRadius | number
  variant?: SquircleVariant
}

interface ElementSize {
  width: number
  height: number
}

type SizeListener = (size: ElementSize) => void

const sizeListeners = new WeakMap<Element, SizeListener>()
let sharedResizeObserver: ResizeObserver | undefined

function readElementSize(element: HTMLElement): ElementSize {
  return {
    width: element.offsetWidth,
    height: element.offsetHeight,
  }
}

function readObservedSize(entry: ResizeObserverEntry): ElementSize {
  const borderBoxSize = entry.borderBoxSize[0]
  if (!borderBoxSize) {
    return entry.target instanceof HTMLElement
      ? readElementSize(entry.target)
      : {
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height),
        }
  }

  return {
    width: Math.round(borderBoxSize.inlineSize),
    height: Math.round(borderBoxSize.blockSize),
  }
}

function getResizeObserver(): ResizeObserver {
  sharedResizeObserver ??= new ResizeObserver((entries) => {
    for (const entry of entries) {
      const listener = sizeListeners.get(entry.target)
      if (listener) {
        listener(readObservedSize(entry))
      }
    }
  })

  return sharedResizeObserver
}

function observeElementSize(element: HTMLElement, listener: SizeListener): () => void {
  sizeListeners.set(element, listener)
  getResizeObserver().observe(element, { box: "border-box" })

  return () => {
    sizeListeners.delete(element)
    sharedResizeObserver?.unobserve(element)
  }
}

function useElementSize(): [
  React.RefCallback<HTMLDivElement>,
  ElementSize,
] {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  const updateSize = useCallback((nextSize: ElementSize) => {
    setSize(previousSize => (
      previousSize.width === nextSize.width && previousSize.height === nextSize.height
        ? previousSize
        : nextSize
    ))
  }, [])

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      return
    }

    updateSize(readElementSize(node))
    return observeElementSize(node, updateSize)
  }, [updateSize])

  return [ref, size]
}

function resolveRadius(radius: SquircleBoxProps["radius"]) {
  if (typeof radius === "number") {
    return radius
  }

  return squircleRadiusValues[radius ?? "2xl"]
}

function SquircleBox({
  className,
  radius,
  variant = "default",
  style,
  ...props
}: SquircleBoxProps): React.JSX.Element {
  const resolvedRadius = resolveRadius(radius)
  const [ref, size] = useElementSize()
  const path = useMemo(() => {
    if (size.width === 0 || size.height === 0) {
      return undefined
    }

    return getSvgPath({
      width: size.width,
      height: size.height,
      cornerRadius: resolvedRadius,
    })
  }, [resolvedRadius, size.height, size.width])

  return (
    <div
      {...props}
      ref={ref}
      className={cn(
        "overflow-hidden",
        variant === "modal-shell" && "bg-[color-mix(in_oklab,var(--popover)_60%,var(--color-theme-400)_40%)] p-2.5",
        variant === "modal-inner" && "bg-background/70 sunrise-theme-400",
        className,
      )}
      style={{
        ...style,
        borderRadius: resolvedRadius,
        clipPath: path ? `path('${path}')` : undefined,
      }}
    />
  )
}

export { SquircleBox }
export type { SquircleRadius }
