import { Hono } from "hono"
import { auth } from "../lib/auth"

export const authApp = new Hono()

authApp.on(["POST", "GET"], "/*", c => auth.handler(c.req.raw))
