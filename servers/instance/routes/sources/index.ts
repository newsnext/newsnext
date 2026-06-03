import { defineHandler } from "nitro"
import { listInstanceSources } from "@/app"
import { getNewsNextInstance } from "@/index"

export default defineHandler(async (event) => {
  return listInstanceSources(await getNewsNextInstance(event))
})
