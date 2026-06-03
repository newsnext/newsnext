import type { H3Event } from "nitro"

export type ApiCloudflareBindings = Partial<CloudflareBindings>

interface NitroCloudflareRuntime {
  cloudflare?: {
    env?: ApiCloudflareBindings
  }
}

interface NitroRequest extends Request {
  runtime?: NitroCloudflareRuntime
}

export function getNitroCloudflareEnv(event: H3Event): ApiCloudflareBindings | undefined {
  return (event.req as NitroRequest).runtime?.cloudflare?.env
}

export function getNitroCloudflareEnvValue(
  env: ApiCloudflareBindings | undefined,
  key: keyof ApiCloudflareBindings,
): string | undefined {
  const value = env?.[key]
  return typeof value === "string" && value ? value : undefined
}
