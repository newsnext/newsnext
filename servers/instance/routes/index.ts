import { defineHandler } from "nitro"
import { renderInstanceHome } from "../src/app"
import { getNewsNextInstance } from "../src"
import { instanceStats } from "../src/nitro-runtime"

export default defineHandler(async (event) => {
  return renderInstanceHome(await getNewsNextInstance(event), instanceStats)
})
