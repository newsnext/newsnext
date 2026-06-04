import type { NewsNextDataInstance } from "./types"
import { createNewsNextInstance } from "./local"

export async function createCloudflareNewsNextInstance(): Promise<NewsNextDataInstance> {
  return createNewsNextInstance()
}

export async function createBunNewsNextInstance(): Promise<NewsNextDataInstance> {
  return createNewsNextInstance()
}

export async function createLocalNewsNextInstance(): Promise<NewsNextDataInstance> {
  return createNewsNextInstance()
}
