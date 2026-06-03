import { defineMiddleware } from "nitro"
import { recordInstanceRequest } from "../src/app"
import { instanceStats } from "../src/nitro-runtime"

export default defineMiddleware(() => {
  recordInstanceRequest(instanceStats)
})
