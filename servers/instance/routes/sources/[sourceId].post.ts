import type { LoadSourceBody } from "@/app"
import { defineHandler } from "nitro"
import { getRouterParam, readBody } from "nitro/h3"
import { getNewsNextInstance, loadInstanceSource } from "@/index"

export default defineHandler(async (event) => {
  const sourceId = getRouterParam(event, "sourceId") ?? ""
  const body = await readBody<LoadSourceBody>(event)
  return loadInstanceSource(await getNewsNextInstance(event), sourceId, body ?? {})
})
