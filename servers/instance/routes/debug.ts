import { defineHandler } from "nitro"
import { getInstanceDebug } from "../src/app"
import { getNewsNextInstance } from "../src"
import { instanceStats } from "../src/nitro-runtime"

export default defineHandler(async (event) => {
  return getInstanceDebug(await getNewsNextInstance(event), instanceStats)
})
