import { getNewsNextInstance, listInstanceSources } from "@/index"
import { defineHandler } from "nitro"

export default defineHandler(async (event) => {
  return listInstanceSources(await getNewsNextInstance(event))
})
