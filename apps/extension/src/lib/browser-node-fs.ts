export function readFileSync(): never {
  throw new Error("node:fs is unavailable in the browser")
}
