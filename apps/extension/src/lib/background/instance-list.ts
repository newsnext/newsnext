import type { Instance } from "../source"
import { listInstancesQuery } from "../application"
import { readApplicationData } from "./application-service"

export async function listConnectedInstances(): Promise<Instance[]> {
  return listInstancesQuery(await readApplicationData())
}
