import { defineHandler } from "nitro"
import { listInstanceSources } from "../../src/app"
import { getNewsNextInstance } from "../../src"

export default defineHandler(async (event) => {
  return listInstanceSources(await getNewsNextInstance(event))
})
