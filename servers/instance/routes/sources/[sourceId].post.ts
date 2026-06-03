import { defineHandler } from "nitro"
import { getRouterParam } from "nitro/h3"
import { loadInstanceSource, readLoadSourceBody } from "../../src/app"
import { getNewsNextInstance } from "../../src"
import { instanceStats } from "../../src/nitro-runtime"

export default defineHandler(async (event) => {
  const sourceId = getRouterParam(event, "sourceId", { decode: true }) ?? ""
  const body = await readLoadSourceBody(event.req)

  return loadInstanceSource(await getNewsNextInstance(event), instanceStats, sourceId, body)
})
