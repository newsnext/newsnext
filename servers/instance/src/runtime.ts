import type {
  BunNewsNextInstanceOptions,
  CloudflareNewsNextInstanceOptions,
  NewsNextDataInstance,
} from "./types"
import {
  createD1NewsNextInstance,
  createMemoryNewsNextInstance,
  createSqliteNewsNextInstance,
} from "./local"
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
      console.log("Using D1 data instance")
      return await createD1NewsNextInstance(options.bindings.CACHE_DB)
    } catch (error) {
      console.error("Failed to initialize D1 data instance:", error)
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

  const cachePath = options.cachePath ?? await getDefaultSqliteCachePath()
  console.log("Using Sqlite data instance")
  return createSqliteNewsNextInstance(cachePath)
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

async function getDefaultSqliteCachePath(): Promise<string> {
  const { CACHE_DB_PATH } = await import("../../../data")
  return CACHE_DB_PATH
}
