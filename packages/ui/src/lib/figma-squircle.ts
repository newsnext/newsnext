/*
 * Adapted from figma-squircle 1.1.0.
 *
 * MIT License
 * Copyright (c) 2021 Tien Pham
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

interface SquirclePathParams {
  width: number
  height: number
  cornerRadius: number
}

const CORNER_SMOOTHING = 0.8

function format(value: number): string {
  return value.toFixed(4)
}

function getSvgPath({
  width,
  height,
  cornerRadius,
}: SquirclePathParams): string {
  const budget = Math.min(width, height) / 2
  const radius = Math.min(cornerRadius, budget)

  if (radius === 0) {
    return `M ${width} 0 l 0.0000 0 L ${width} ${height} l 0 0.0000 L 0 ${height} l 0.0000 0 L 0 0 l 0 0.0000 Z`
  }

  const smoothing = Math.min(CORNER_SMOOTHING, budget / radius - 1)
  const p = Math.min((1 + smoothing) * radius, budget)
  const arcMeasure = 90 * (1 - smoothing)
  const arcSection = Math.sin(arcMeasure / 2 * Math.PI / 180) * radius * Math.sqrt(2)
  const angleAlpha = (90 - arcMeasure) / 2
  const p3ToP4Distance = radius * Math.tan(angleAlpha / 2 * Math.PI / 180)
  const angleBeta = 45 * smoothing * Math.PI / 180
  const c = p3ToP4Distance * Math.cos(angleBeta)
  const d = c * Math.tan(angleBeta)
  const b = (p - arcSection - c - d) / 3
  const a = 2 * b
  const ab = a + b
  const abc = ab + c
  const bc = b + c

  return [
    `M ${width - p} 0`,
    `c ${format(a)} 0 ${format(ab)} 0 ${format(abc)} ${format(d)}`,
    `a ${format(radius)} ${format(radius)} 0 0 1 ${format(arcSection)} ${format(arcSection)}`,
    `c ${format(d)} ${format(c)} ${format(d)} ${format(bc)} ${format(d)} ${format(abc)}`,
    `L ${width} ${height - p}`,
    `c 0 ${format(a)} 0 ${format(ab)} ${format(-d)} ${format(abc)}`,
    `a ${format(radius)} ${format(radius)} 0 0 1 -${format(arcSection)} ${format(arcSection)}`,
    `c ${format(-c)} ${format(d)} ${format(-bc)} ${format(d)} ${format(-abc)} ${format(d)}`,
    `L ${p} ${height}`,
    `c ${format(-a)} 0 ${format(-ab)} 0 ${format(-abc)} ${format(-d)}`,
    `a ${format(radius)} ${format(radius)} 0 0 1 -${format(arcSection)} -${format(arcSection)}`,
    `c ${format(-d)} ${format(-c)} ${format(-d)} ${format(-bc)} ${format(-d)} ${format(-abc)}`,
    `L 0 ${p}`,
    `c 0 ${format(-a)} 0 ${format(-ab)} ${format(d)} ${format(-abc)}`,
    `a ${format(radius)} ${format(radius)} 0 0 1 ${format(arcSection)} -${format(arcSection)}`,
    `c ${format(c)} ${format(-d)} ${format(bc)} ${format(-d)} ${format(abc)} ${format(-d)}`,
    "Z",
  ].join(" ")
}

export { getSvgPath }
