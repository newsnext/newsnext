import hono from "./src/index"

export default {
  async fetch(req: Request) {
    return hono.fetch(req)
  },
}