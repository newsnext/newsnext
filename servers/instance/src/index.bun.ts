import { createNewsNextInstanceApp } from "./app"
import { createBunNewsNextInstance } from "./runtime"

const instance = await createBunNewsNextInstance()
const app = createNewsNextInstanceApp(instance)
const port = process.env.PORT ?? 4001

console.log(`NewsNext instance listening on http://localhost:${port}`)

export default {
  port,
  fetch: app.fetch,
}
