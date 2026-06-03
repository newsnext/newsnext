import type { H3Event } from "nitro"
import type { NewsNextDataInstance } from "./instance-client"
import { getNitroCloudflareEnv, getNitroCloudflareEnvValue } from "./cloudflare-bindings"
import { createRemoteNewsNextInstance, RemoteNewsNextInstance } from "./instance-client"

export type { AppRouter } from "./routes/trpc/app-router"

let instance: NewsNextDataInstance | undefined

export async function loadInstance(event: H3Event): Promise<NewsNextDataInstance> {
  if (instance) {
    return instance
  }

  const bindings = getNitroCloudflareEnv(event)
  const service = bindings?.INSTANCE
  if (service) {
    instance = new RemoteNewsNextInstance({
      url: "https://newsnext-instance.internal",
      fetch: (input, init) => service.fetch(input, init),
    })
    return instance
  }

  const remoteUrl = getNitroCloudflareEnvValue(bindings, "NEWSNEXT_INSTANCE_URL") ?? process.env.NEWSNEXT_INSTANCE_URL
  if (remoteUrl) {
    instance = createRemoteNewsNextInstance(remoteUrl)
    return instance
  }

  throw new Error("NEWSNEXT_INSTANCE_URL or INSTANCE binding is required for NewsNext API")
}
