import { Hono } from "hono"
import { getCloudflareBindings } from "../cloudflare-bindings"
import { getAuth } from "../lib/auth"

export const authApp = new Hono()

authApp.on(["POST", "GET"], "/*", async (c) => {
  const auth = await getAuth(getCloudflareBindings(c.env as CloudflareBindings | undefined, c.req.raw))
  return auth.handler(c.req.raw)
})
