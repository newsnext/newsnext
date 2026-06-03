import { drizzle as drizzleD1 } from "drizzle-orm/d1"
import * as schema from "./schema"

export type NewsNextDatabase = ReturnType<typeof drizzleD1<typeof schema>>

export function createD1Db(d1: unknown): NewsNextDatabase {
  return drizzleD1(d1 as never, { schema }) as unknown as NewsNextDatabase
}
