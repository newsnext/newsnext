export function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list)
  result.splice(endIndex, 0, ...result.splice(startIndex, 1))
  return result
}
