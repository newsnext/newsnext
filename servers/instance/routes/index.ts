import { defineHandler } from "nitro"
import { renderInstanceHome } from "@/app"
import { getNewsNextInstance } from "@/index"
import { instanceStats } from "@/nitro-runtime"

export default defineHandler(async (event) => {
  return renderInstanceHome(await getNewsNextInstance(event), instanceStats)
})
