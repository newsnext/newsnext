import { defineEventHandler, getRouterParams } from "nitro/h3"

export default defineEventHandler(async (event) => {
  const { route } = getRouterParams(event)
  console.log(route)
})