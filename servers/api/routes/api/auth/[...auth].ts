import type { ApiCloudflareBindings } from "../../../src/cloudflare-bindings"
import type { H3Event } from "nitro"
import { defineHandler } from "nitro"
import { getCloudflareBindings } from "../../../src/cloudflare-bindings"
import { getAuth } from "../../../src/lib/auth"

export default defineHandler(async (event) => {
  const auth = await getAuth(getCloudflareBindings(getNitroCloudflareEnv(event), event.req))
  return auth.handler(event.req)
})

interface NitroCloudflareRuntime {
  cloudflare?: {
    env?: ApiCloudflareBindings
  }
}

interface NitroRequest extends Request {
  runtime?: NitroCloudflareRuntime
}

function getNitroCloudflareEnv(event: H3Event): ApiCloudflareBindings | undefined {
  return (event.req as NitroRequest).runtime?.cloudflare?.env
}
