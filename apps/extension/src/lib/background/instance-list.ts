import type { Instance } from "../source"
import { executeApplicationQuery } from "../application"
import { readConnectedApplicationData } from "./application-service"

export async function listConnectedInstances(): Promise<Instance[]> {
  return executeApplicationQuery(
    await readConnectedApplicationData(),
    { type: "instance.list" },
  )
}
