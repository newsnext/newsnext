import { db } from "."

async function seed() {
  // await db.insert(cache).values({ key: "test", value: "test" })
  const result = await db.query.cache.findMany()
  console.log(result)
}

seed()