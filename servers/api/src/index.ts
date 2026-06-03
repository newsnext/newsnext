import type { NewsNextDataInstance } from "@newsnext/instance/types"
import type { H3Event } from "nitro"
import { getNitroCloudflareEnv, getNitroCloudflareEnvValue } from "./cloudflare-bindings"

export type { AppRouter } from "./routes/trpc/app-router"

let instance: NewsNextDataInstance | undefined

export async function loadInstance(event: H3Event): Promise<NewsNextDataInstance> {
  if (instance) {
    return instance
  }

  const bindings = getNitroCloudflareEnv(event)
  const service = bindings?.INSTANCE
  if (service) {
    const { RemoteNewsNextInstance } = await import("@newsnext/instance/remote")
    instance = new RemoteNewsNextInstance({
      url: "https://newsnext-instance.internal",
      fetch: (input, init) => service.fetch(input, init),
    })
    return instance
  }

  const remoteUrl = getNitroCloudflareEnvValue(bindings, "NEWSNEXT_INSTANCE_URL") ?? process.env.NEWSNEXT_INSTANCE_URL
  if (remoteUrl) {
    const { createRemoteNewsNextInstance } = await import("@newsnext/instance/remote")
    instance = createRemoteNewsNextInstance(remoteUrl)
    return instance
  }

  if (!bindings) {
    const { createMemoryNewsNextInstance } = await import("@newsnext/instance/local")
    instance = await createMemoryNewsNextInstance()
    return instance
  }

  const { createCloudflareNewsNextInstance } = await import("@newsnext/instance/runtime")
  instance = await createCloudflareNewsNextInstance({
    bindings,
  })
  return instance
}
