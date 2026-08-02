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

const CORNER_SMOOTHING = 0.8

interface SquircleCornerValues {
  radius: number
  p: number
  arcSection: number
  a: number
  ab: number
  abc: number
  c: number
  d: number
  bc: number
}

function format(value: number): string {
  return value.toFixed(4)
}

function getCornerValues(radius: number): SquircleCornerValues {
  const smoothing = CORNER_SMOOTHING
  const p = (1 + smoothing) * radius
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

  return { radius, p, arcSection, a, ab, abc, c, d, bc }
}

function getCssShape(cornerRadius: number): string {
  if (cornerRadius === 0) {
    return "inset(0)"
  }

  const { radius, p, arcSection, a, ab, abc, c, d, bc } = getCornerValues(cornerRadius)
  const px = (value: number) => `${format(value)}px`

  return [
    `shape(from calc(100% - ${px(p)}) 0`,
    `curve by ${px(abc)} ${px(d)} with ${px(a)} 0 from start / ${px(ab)} 0 from start`,
    `arc by ${px(arcSection)} ${px(arcSection)} of ${px(radius)} cw`,
    `curve by ${px(d)} ${px(abc)} with ${px(d)} ${px(c)} from start / ${px(d)} ${px(bc)} from start`,
    `line to 100% calc(100% - ${px(p)})`,
    `curve by ${px(-d)} ${px(abc)} with 0 ${px(a)} from start / 0 ${px(ab)} from start`,
    `arc by ${px(-arcSection)} ${px(arcSection)} of ${px(radius)} cw`,
    `curve by ${px(-abc)} ${px(d)} with ${px(-c)} ${px(d)} from start / ${px(-bc)} ${px(d)} from start`,
    `line to ${px(p)} 100%`,
    `curve by ${px(-abc)} ${px(-d)} with ${px(-a)} 0 from start / ${px(-ab)} 0 from start`,
    `arc by ${px(-arcSection)} ${px(-arcSection)} of ${px(radius)} cw`,
    `curve by ${px(-d)} ${px(-abc)} with ${px(-d)} ${px(-c)} from start / ${px(-d)} ${px(-bc)} from start`,
    `line to 0 ${px(p)}`,
    `curve by ${px(d)} ${px(-abc)} with 0 ${px(-a)} from start / 0 ${px(-ab)} from start`,
    `arc by ${px(arcSection)} ${px(-arcSection)} of ${px(radius)} cw`,
    `curve by ${px(abc)} ${px(-d)} with ${px(c)} ${px(-d)} from start / ${px(bc)} ${px(-d)} from start`,
    "close)",
  ].join(", ")
}

export { getCssShape }
