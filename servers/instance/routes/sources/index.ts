import { defineHandler } from "nitro"
import { getNewsNextInstance, listInstanceSources } from "@/index"

export default defineHandler(async (event) => {
  return listInstanceSources(await getNewsNextInstance(event))
})
