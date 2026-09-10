import type { LiveCard } from "../source"
import { listLiveCardsQuery } from "../application"
import { readApplicationData } from "./application-service"

export async function listConnectedLiveCards(): Promise<LiveCard[]> {
  return listLiveCardsQuery(await readApplicationData())
}
