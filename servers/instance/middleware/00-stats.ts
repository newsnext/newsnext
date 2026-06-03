import { defineMiddleware } from "nitro"
import { recordInstanceRequest } from "@/app"
import { instanceStats } from "@/nitro-runtime"

export default defineMiddleware(() => {
  recordInstanceRequest(instanceStats)
})
