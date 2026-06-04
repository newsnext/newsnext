import type { H3Event } from "nitro"
import { createLocalNewsNextInstance } from "./runtime"

export * from "./errors"
export * from "./app"
export * from "./local"
export * from "./runtime"
export * from "./source-loader"
export * from "./types"

let instance: Awaited<ReturnType<typeof createLocalNewsNextInstance>> | undefined

export async function getNewsNextInstance(_event?: H3Event) {
  instance ??= await createLocalNewsNextInstance()
  return instance
}
