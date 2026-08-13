import type { SourceInstance } from "../source"
import { executeApplicationQuery } from "../application"
import { readConnectedApplicationData } from "./application-service"

export async function listConnectedInstances(): Promise<SourceInstance[]> {
  return executeApplicationQuery(
    await readConnectedApplicationData(),
    { type: "instance.list" },
  )
}
