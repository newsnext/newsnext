import { defineHandler } from "nitro"
import { getInstanceDebug } from "@/app"
import { getNewsNextInstance } from "@/index"
import { instanceStats } from "@/nitro-runtime"

export default defineHandler(async (event) => {
  return getInstanceDebug(await getNewsNextInstance(event), instanceStats)
})
