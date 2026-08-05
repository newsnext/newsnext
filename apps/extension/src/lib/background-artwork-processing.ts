export const DEFAULT_LINE_ART_THRESHOLD = 36
export const NO_CLEAR_LINE_ART_ERROR_MESSAGE = "No clear line art was found. Try lowering Edge detail."

export type BackgroundArtworkFormat = "svg" | "webp"

export const MAX_WEBP_LINE_ART_DIMENSION = 1400
export const MAX_SVG_LINE_ART_DIMENSION = 1800
const GAUSSIAN_KERNEL = [1, 4, 6, 4, 1] as const
const GAUSSIAN_WEIGHT = 16
const LOW_THRESHOLD_RATIO = 0.25
const NEIGHBOR_OFFSETS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
] as const
const REVERSE_DIRECTIONS = [7, 6, 5, 4, 3, 2, 1, 0] as const
const PATH_SIMPLIFICATION_TOLERANCE = 0.5
const MAX_GAP_BRIDGE_DISTANCE = 12
const MIN_GAP_ALIGNMENT = 0.7
const MIN_EDGE_COMPONENT_SIZE = 6
const LINE_ART_BOUNDS_PADDING = 4

interface EdgePoint {
  x: number
  y: number
}

interface CroppedLineArtPixels {
  height: number
  pixels: Uint8ClampedArray<ArrayBuffer>
  width: number
}

interface PixelBounds {
  height: number
  width: number
  x: number
  y: number
}

export function extractLineArtPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number,
): Uint8ClampedArray<ArrayBuffer> {
  return renderWebpLineArtPixels(
    extractWebpLineArtMagnitude(pixels, width, height),
    threshold,
  )
}

export function extractWebpLineArtMagnitude(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array<ArrayBuffer> {
  const grayscale = createGrayscalePixels(pixels, width, height)
  const magnitude = new Float32Array(width * height)
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x
      const topLeft = grayscale[index - width - 1] ?? 0
      const top = grayscale[index - width] ?? 0
      const topRight = grayscale[index - width + 1] ?? 0
      const left = grayscale[index - 1] ?? 0
      const right = grayscale[index + 1] ?? 0
      const bottomLeft = grayscale[index + width - 1] ?? 0
      const bottom = grayscale[index + width] ?? 0
      const bottomRight = grayscale[index + width + 1] ?? 0
      const gradientX = -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight
      const gradientY = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight
      magnitude[index] = Math.hypot(gradientX, gradientY) / 4
    }
  }

  return magnitude
}

export function renderWebpLineArtPixels(
  magnitude: Float32Array,
  threshold: number,
): Uint8ClampedArray<ArrayBuffer> {
  const output = new Uint8ClampedArray(new ArrayBuffer(magnitude.length * 4))
  for (let index = 0; index < magnitude.length; index += 1) {
    output[index * 4 + 3] = Math.min(255, Math.max(0, ((magnitude[index] ?? 0) - threshold) * 5))
  }

  return output
}

export function extractSvgLineArtMagnitude(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array<ArrayBuffer> {
  const grayscale = createGrayscalePixels(pixels, width, height)

  const blurred = blurGrayscale(grayscale, width, height)
  const gradientX = new Float32Array(width * height)
  const gradientY = new Float32Array(width * height)
  const magnitude = new Float32Array(width * height)
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x
      const topLeft = blurred[index - width - 1] ?? 0
      const top = blurred[index - width] ?? 0
      const topRight = blurred[index - width + 1] ?? 0
      const left = blurred[index - 1] ?? 0
      const right = blurred[index + 1] ?? 0
      const bottomLeft = blurred[index + width - 1] ?? 0
      const bottom = blurred[index + width] ?? 0
      const bottomRight = blurred[index + width + 1] ?? 0
      gradientX[index] = -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight
      gradientY[index] = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight
      magnitude[index] = Math.hypot(gradientX[index] ?? 0, gradientY[index] ?? 0) / 4
    }
  }

  const thinned = new Float32Array(width * height)
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x
      const strength = magnitude[index] ?? 0
      if (strength === 0) continue

      const angle = (Math.atan2(gradientY[index] ?? 0, gradientX[index] ?? 0) * 180 / Math.PI + 180) % 180
      let before: number
      let after: number
      if (angle < 22.5 || angle >= 157.5) {
        before = magnitude[index - 1] ?? 0
        after = magnitude[index + 1] ?? 0
      } else if (angle < 67.5) {
        before = magnitude[index - width - 1] ?? 0
        after = magnitude[index + width + 1] ?? 0
      } else if (angle < 112.5) {
        before = magnitude[index - width] ?? 0
        after = magnitude[index + width] ?? 0
      } else {
        before = magnitude[index - width + 1] ?? 0
        after = magnitude[index + width - 1] ?? 0
      }

      if (strength > before && strength >= after) thinned[index] = strength
    }
  }

  return thinned
}

export function selectConnectedEdges(
  magnitude: Float32Array,
  width: number,
  height: number,
  highThreshold: number,
): Uint8Array<ArrayBuffer> {
  const lowThreshold = highThreshold * LOW_THRESHOLD_RATIO
  const states = new Uint8Array(new ArrayBuffer(magnitude.length))
  const queue = new Int32Array(magnitude.length)
  let queueEnd = 0

  for (let index = 0; index < magnitude.length; index += 1) {
    const strength = magnitude[index] ?? 0
    if (strength >= highThreshold) {
      states[index] = 2
      queue[queueEnd] = index
      queueEnd += 1
    } else if (strength >= lowThreshold) {
      states[index] = 1
    }
  }

  for (let queueIndex = 0; queueIndex < queueEnd; queueIndex += 1) {
    const index = queue[queueIndex] ?? 0
    const x = index % width
    const y = Math.floor(index / width)
    const minX = Math.max(0, x - 1)
    const maxX = Math.min(width - 1, x + 1)
    const minY = Math.max(0, y - 1)
    const maxY = Math.min(height - 1, y + 1)

    for (let neighborY = minY; neighborY <= maxY; neighborY += 1) {
      for (let neighborX = minX; neighborX <= maxX; neighborX += 1) {
        const neighborIndex = neighborY * width + neighborX
        if (states[neighborIndex] !== 1) continue

        states[neighborIndex] = 2
        queue[queueEnd] = neighborIndex
        queueEnd += 1
      }
    }
  }

  for (let index = 0; index < states.length; index += 1) {
    states[index] = states[index] === 2 ? 1 : 0
  }
  return states
}

export function removeSmallEdgeComponents(
  edges: Uint8Array,
  width: number,
  height: number,
  minSize = MIN_EDGE_COMPONENT_SIZE,
): Uint8Array<ArrayBuffer> {
  const output = new Uint8Array(edges.length)
  const visited = new Uint8Array(edges.length)
  const queue = new Int32Array(edges.length)

  for (let startIndex = 0; startIndex < edges.length; startIndex += 1) {
    if (edges[startIndex] === 0 || visited[startIndex] !== 0) continue

    let queueStart = 0
    let queueEnd = 1
    queue[0] = startIndex
    visited[startIndex] = 1
    while (queueStart < queueEnd) {
      const index = queue[queueStart] ?? 0
      queueStart += 1
      for (let direction = 0; direction < NEIGHBOR_OFFSETS.length; direction += 1) {
        const neighborIndex = getNeighborIndex(index, direction, edges, width, height)
        if (neighborIndex === -1 || visited[neighborIndex] !== 0) continue
        visited[neighborIndex] = 1
        queue[queueEnd] = neighborIndex
        queueEnd += 1
      }
    }

    if (queueEnd < minSize) continue
    for (let queueIndex = 0; queueIndex < queueEnd; queueIndex += 1) {
      output[queue[queueIndex] ?? 0] = 1
    }
  }

  return output
}

export function cleanAndCropLineArtPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): CroppedLineArtPixels | null {
  const alphaEdges = new Uint8Array(width * height)
  for (let index = 0; index < alphaEdges.length; index += 1) {
    if ((pixels[index * 4 + 3] ?? 0) > 0) alphaEdges[index] = 1
  }

  const cleanedEdges = removeSmallEdgeComponents(alphaEdges, width, height)
  const bounds = resolvePixelBounds(cleanedEdges, width, height, LINE_ART_BOUNDS_PADDING)
  if (!bounds) return null

  const croppedPixels = new Uint8ClampedArray(new ArrayBuffer(bounds.width * bounds.height * 4))
  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const sourcePixelIndex = (bounds.y + y) * width + bounds.x + x
      if (cleanedEdges[sourcePixelIndex] === 0) continue
      const sourceIndex = sourcePixelIndex * 4
      const targetIndex = (y * bounds.width + x) * 4
      croppedPixels[targetIndex] = pixels[sourceIndex] ?? 0
      croppedPixels[targetIndex + 1] = pixels[sourceIndex + 1] ?? 0
      croppedPixels[targetIndex + 2] = pixels[sourceIndex + 2] ?? 0
      croppedPixels[targetIndex + 3] = pixels[sourceIndex + 3] ?? 0
    }
  }

  return {
    height: bounds.height,
    pixels: croppedPixels,
    width: bounds.width,
  }
}

export function traceEdgePaths(
  edges: Uint8Array,
  width: number,
  height: number,
): EdgePoint[][] {
  const degrees = new Uint8Array(edges.length)
  const visitedDirections = new Uint8Array(edges.length)
  const paths: EdgePoint[][] = []

  for (let index = 0; index < edges.length; index += 1) {
    if (edges[index] === 0) continue

    let degree = 0
    for (let direction = 0; direction < NEIGHBOR_OFFSETS.length; direction += 1) {
      if (getNeighborIndex(index, direction, edges, width, height) !== -1) degree += 1
    }
    degrees[index] = degree
  }

  function trace(startIndex: number, startDirection: number): EdgePoint[] {
    const points: EdgePoint[] = [{ x: startIndex % width, y: Math.floor(startIndex / width) }]
    let index = startIndex
    let direction = startDirection

    while (direction !== -1) {
      const nextIndex = getNeighborIndex(index, direction, edges, width, height)
      if (nextIndex === -1) break

      visitedDirections[index] = (visitedDirections[index] ?? 0) | (1 << direction)
      const reverseDirection = REVERSE_DIRECTIONS[direction] ?? 0
      visitedDirections[nextIndex] = (visitedDirections[nextIndex] ?? 0) | (1 << reverseDirection)
      points.push({ x: nextIndex % width, y: Math.floor(nextIndex / width) })
      index = nextIndex
      if (degrees[index] !== 2) break

      direction = -1
      for (let candidate = 0; candidate < NEIGHBOR_OFFSETS.length; candidate += 1) {
        const isVisited = ((visitedDirections[index] ?? 0) & (1 << candidate)) !== 0
        if (!isVisited && getNeighborIndex(index, candidate, edges, width, height) !== -1) {
          direction = candidate
          break
        }
      }
    }

    return points
  }

  function traceAvailablePaths(index: number): void {
    for (let direction = 0; direction < NEIGHBOR_OFFSETS.length; direction += 1) {
      const isVisited = ((visitedDirections[index] ?? 0) & (1 << direction)) !== 0
      if (isVisited || getNeighborIndex(index, direction, edges, width, height) === -1) continue

      const path = trace(index, direction)
      if (path.length >= 2) paths.push(simplifyEdgePath(path))
    }
  }

  for (let index = 0; index < edges.length; index += 1) {
    if (edges[index] !== 0 && degrees[index] !== 2) traceAvailablePaths(index)
  }
  for (let index = 0; index < edges.length; index += 1) {
    if (edges[index] !== 0) traceAvailablePaths(index)
  }

  return paths
}

export function bridgeEdgeGaps(
  edges: Uint8Array,
  width: number,
  height: number,
): Uint8Array<ArrayBuffer> {
  const bridged = new Uint8Array(edges)
  const endpoints = new Uint8Array(edges.length)
  const connected = new Uint8Array(edges.length)

  for (let index = 0; index < edges.length; index += 1) {
    if (edges[index] !== 0 && countEdgeNeighbors(index, edges, width, height) === 1) {
      endpoints[index] = 1
    }
  }

  for (let index = 0; index < endpoints.length; index += 1) {
    if (endpoints[index] === 0 || connected[index] !== 0) continue

    const startX = index % width
    const startY = Math.floor(index / width)
    const startDirection = getEndpointDirection(index, edges, width, height)
    if (!startDirection) continue

    let bestIndex = -1
    let bestDistanceSquared = Number.POSITIVE_INFINITY
    const minX = Math.max(0, startX - MAX_GAP_BRIDGE_DISTANCE)
    const maxX = Math.min(width - 1, startX + MAX_GAP_BRIDGE_DISTANCE)
    const minY = Math.max(0, startY - MAX_GAP_BRIDGE_DISTANCE)
    const maxY = Math.min(height - 1, startY + MAX_GAP_BRIDGE_DISTANCE)

    for (let candidateY = minY; candidateY <= maxY; candidateY += 1) {
      for (let candidateX = minX; candidateX <= maxX; candidateX += 1) {
        const candidateIndex = candidateY * width + candidateX
        if (candidateIndex === index || endpoints[candidateIndex] === 0 || connected[candidateIndex] !== 0) continue

        const deltaX = candidateX - startX
        const deltaY = candidateY - startY
        const distanceSquared = deltaX ** 2 + deltaY ** 2
        if (distanceSquared <= 2 || distanceSquared > MAX_GAP_BRIDGE_DISTANCE ** 2) continue

        const distance = Math.sqrt(distanceSquared)
        const directionX = deltaX / distance
        const directionY = deltaY / distance
        const startAlignment = startDirection.x * directionX + startDirection.y * directionY
        if (startAlignment < MIN_GAP_ALIGNMENT) continue

        const candidateDirection = getEndpointDirection(candidateIndex, edges, width, height)
        if (!candidateDirection) continue
        const candidateAlignment = candidateDirection.x * -directionX + candidateDirection.y * -directionY
        if (candidateAlignment < MIN_GAP_ALIGNMENT || distanceSquared >= bestDistanceSquared) continue

        bestIndex = candidateIndex
        bestDistanceSquared = distanceSquared
      }
    }

    if (bestIndex === -1) continue

    drawEdgeLine(bridged, width, startX, startY, bestIndex % width, Math.floor(bestIndex / width))
    connected[index] = 1
    connected[bestIndex] = 1
  }

  return bridged
}

export function createLineArtSvg(
  edges: Uint8Array,
  width: number,
  height: number,
): string {
  const cleanedEdges = removeSmallEdgeComponents(edges, width, height)
  const bridgedEdges = bridgeEdgeGaps(cleanedEdges, width, height)
  const bounds = resolvePixelBounds(bridgedEdges, width, height, LINE_ART_BOUNDS_PADDING)
  if (!bounds) throw new Error(NO_CLEAR_LINE_ART_ERROR_MESSAGE)

  const commands = traceEdgePaths(bridgedEdges, width, height).map((path) => {
    const [first, ...rest] = path
    if (!first) return ""
    return `M${first.x} ${first.y}${rest.map(point => `L${point.x} ${point.y}`).join("")}`
  }).join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" shape-rendering="geometricPrecision"><path d="${commands}" transform="translate(.5 .5)" fill="none" stroke="#000" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}

function resolvePixelBounds(
  edges: Uint8Array,
  width: number,
  height: number,
  padding: number,
): PixelBounds | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let index = 0; index < edges.length; index += 1) {
    if (edges[index] === 0) continue
    const x = index % width
    const y = Math.floor(index / width)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  if (maxX === -1 || maxY === -1) return null

  const x = Math.max(0, minX - padding)
  const y = Math.max(0, minY - padding)
  const right = Math.min(width - 1, maxX + padding)
  const bottom = Math.min(height - 1, maxY + padding)
  return {
    height: bottom - y + 1,
    width: right - x + 1,
    x,
    y,
  }
}

function createGrayscalePixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array<ArrayBuffer> {
  const grayscale = new Float32Array(new ArrayBuffer(width * height * Float32Array.BYTES_PER_ELEMENT))
  for (let index = 0; index < grayscale.length; index += 1) {
    const pixelIndex = index * 4
    grayscale[index] = (
      (pixels[pixelIndex] ?? 0) * 0.2126
      + (pixels[pixelIndex + 1] ?? 0) * 0.7152
      + (pixels[pixelIndex + 2] ?? 0) * 0.0722
    )
  }
  return grayscale
}

function blurGrayscale(
  grayscale: Float32Array,
  width: number,
  height: number,
): Float32Array<ArrayBuffer> {
  const horizontal = new Float32Array(new ArrayBuffer(grayscale.byteLength))
  const output = new Float32Array(new ArrayBuffer(grayscale.byteLength))

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0
      for (let offset = -2; offset <= 2; offset += 1) {
        const sourceX = Math.min(width - 1, Math.max(0, x + offset))
        sum += (grayscale[y * width + sourceX] ?? 0) * (GAUSSIAN_KERNEL[offset + 2] ?? 0)
      }
      horizontal[y * width + x] = sum / GAUSSIAN_WEIGHT
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0
      for (let offset = -2; offset <= 2; offset += 1) {
        const sourceY = Math.min(height - 1, Math.max(0, y + offset))
        sum += (horizontal[sourceY * width + x] ?? 0) * (GAUSSIAN_KERNEL[offset + 2] ?? 0)
      }
      output[y * width + x] = sum / GAUSSIAN_WEIGHT
    }
  }

  return output
}

function getNeighborIndex(
  index: number,
  direction: number,
  edges: Uint8Array,
  width: number,
  height: number,
): number {
  const offset = NEIGHBOR_OFFSETS[direction]
  if (!offset) return -1

  const x = index % width + offset[0]
  const y = Math.floor(index / width) + offset[1]
  if (x < 0 || x >= width || y < 0 || y >= height) return -1

  const neighborIndex = y * width + x
  if (edges[neighborIndex] === 0) return -1

  if (offset[0] !== 0 && offset[1] !== 0) {
    const horizontalIndex = Math.floor(index / width) * width + x
    const verticalIndex = y * width + index % width
    if (edges[horizontalIndex] !== 0 || edges[verticalIndex] !== 0) return -1
  }

  return neighborIndex
}

function countEdgeNeighbors(index: number, edges: Uint8Array, width: number, height: number): number {
  let count = 0
  for (let direction = 0; direction < NEIGHBOR_OFFSETS.length; direction += 1) {
    if (getNeighborIndex(index, direction, edges, width, height) !== -1) count += 1
  }
  return count
}

function getEndpointDirection(
  endpointIndex: number,
  edges: Uint8Array,
  width: number,
  height: number,
): EdgePoint | null {
  let previousIndex = -1
  let currentIndex = endpointIndex

  for (let step = 0; step < 5; step += 1) {
    let nextIndex = -1
    for (let direction = 0; direction < NEIGHBOR_OFFSETS.length; direction += 1) {
      const candidateIndex = getNeighborIndex(currentIndex, direction, edges, width, height)
      if (candidateIndex !== -1 && candidateIndex !== previousIndex) {
        nextIndex = candidateIndex
        break
      }
    }
    if (nextIndex === -1) break

    previousIndex = currentIndex
    currentIndex = nextIndex
  }

  if (currentIndex === endpointIndex) return null

  const deltaX = endpointIndex % width - currentIndex % width
  const deltaY = Math.floor(endpointIndex / width) - Math.floor(currentIndex / width)
  const length = Math.hypot(deltaX, deltaY)
  return length === 0 ? null : { x: deltaX / length, y: deltaY / length }
}

function drawEdgeLine(
  edges: Uint8Array,
  width: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): void {
  let x = startX
  let y = startY
  const deltaX = Math.abs(endX - startX)
  const deltaY = Math.abs(endY - startY)
  const stepX = startX < endX ? 1 : -1
  const stepY = startY < endY ? 1 : -1
  let error = deltaX - deltaY

  while (true) {
    edges[y * width + x] = 1
    if (x === endX && y === endY) break

    const doubledError = error * 2
    if (doubledError > -deltaY) {
      error -= deltaY
      x += stepX
    }
    if (doubledError < deltaX) {
      error += deltaX
      y += stepY
    }
  }
}

function simplifyEdgePath(points: EdgePoint[]): EdgePoint[] {
  if (points.length <= 2) return points

  const isClosed = points[0]?.x === points.at(-1)?.x && points[0]?.y === points.at(-1)?.y
  if (!isClosed) return simplifyOpenPath(points)

  const loop = points.slice(0, -1)
  const splitIndex = Math.floor(loop.length / 2)
  const firstHalf = simplifyOpenPath(loop.slice(0, splitIndex + 1))
  const secondHalf = simplifyOpenPath([...loop.slice(splitIndex), loop[0] as EdgePoint])
  return [...firstHalf, ...secondHalf.slice(1)]
}

function simplifyOpenPath(points: EdgePoint[]): EdgePoint[] {
  if (points.length <= 2) return points

  const first = points[0] as EdgePoint
  const last = points.at(-1) as EdgePoint
  let furthestIndex = -1
  let furthestDistance = 0
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = squaredDistanceToSegment(points[index] as EdgePoint, first, last)
    if (distance > furthestDistance) {
      furthestDistance = distance
      furthestIndex = index
    }
  }

  if (furthestDistance <= PATH_SIMPLIFICATION_TOLERANCE ** 2) return [first, last]

  const left = simplifyOpenPath(points.slice(0, furthestIndex + 1))
  const right = simplifyOpenPath(points.slice(furthestIndex))
  return [...left.slice(0, -1), ...right]
}

function squaredDistanceToSegment(point: EdgePoint, start: EdgePoint, end: EdgePoint): number {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  if (deltaX === 0 && deltaY === 0) {
    return (point.x - start.x) ** 2 + (point.y - start.y) ** 2
  }

  const position = Math.max(0, Math.min(1, (
    (point.x - start.x) * deltaX + (point.y - start.y) * deltaY
  ) / (deltaX ** 2 + deltaY ** 2)))
  const nearestX = start.x + position * deltaX
  const nearestY = start.y + position * deltaY
  return (point.x - nearestX) ** 2 + (point.y - nearestY) ** 2
}
