import type {
  BunNewsNextInstanceOptions,
  CloudflareNewsNextInstanceOptions,
  NewsNextDataInstance,
} from "./types"
import { createMemoryNewsNextInstance } from "./local"
import { createRemoteNewsNextInstance } from "./remote"

export async function createCloudflareNewsNextInstance(
  options: CloudflareNewsNextInstanceOptions,
): Promise<NewsNextDataInstance> {
  const remoteUrl = options.remoteUrl ?? process.env.NEWSNEXT_INSTANCE_URL
  if (remoteUrl) {
    console.log("Using remote data instance")
    return createRemoteNewsNextInstance(remoteUrl)
  }

  if (options.bindings.CACHE_DB) {
    try {
      console.log("Using db0 cache instance")
      const { createNitroDatabaseNewsNextInstance } = await import("./local-database")
      return await createNitroDatabaseNewsNextInstance()
    } catch (error) {
      console.error("Failed to initialize db0 cache instance:", error)
    }
  }

  console.log("Using Memory data instance")
  return createMemoryNewsNextInstance()
}

export async function createBunNewsNextInstance(
  options: BunNewsNextInstanceOptions = {},
): Promise<NewsNextDataInstance> {
  const remoteUrl = options.remoteUrl ?? process.env.NEWSNEXT_INSTANCE_URL
  if (remoteUrl) {
    console.log("Using remote data instance")
    return createRemoteNewsNextInstance(remoteUrl)
  }

  const cachePath = options.cachePath ?? await getDefaultCachePath()
  console.log("Using local db0 cache instance")
  const localDb0Module = ["./local", "db0"].join("-")
  const { createDb0NewsNextInstance } = await import(localDb0Module)
  return createDb0NewsNextInstance(cachePath)
}

export async function createLocalNewsNextInstance(
  options: BunNewsNextInstanceOptions = {},
): Promise<NewsNextDataInstance> {
  if (typeof Bun === "undefined") {
    const remoteUrl = options.remoteUrl ?? process.env.NEWSNEXT_INSTANCE_URL
    if (remoteUrl) {
      console.log("Using remote data instance")
      return createRemoteNewsNextInstance(remoteUrl)
    }

    console.log("Using Memory data instance")
    return createMemoryNewsNextInstance()
  }

  return createBunNewsNextInstance(options)
}

async function getDefaultCachePath(): Promise<string> {
  const { CACHE_DB_PATH } = await import("@newsnext/cache/paths")
  return CACHE_DB_PATH
}
