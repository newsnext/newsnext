export function isLocalApiRuntime(): boolean {
  return "Bun" in globalThis || (typeof process !== "undefined" && process.release?.name === "node")
}
