import { defineMiddleware } from "nitro"

export default defineMiddleware((event) => {
  console.log(`${event.req.method} ${event.url.pathname}`)
})
