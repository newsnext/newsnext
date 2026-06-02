import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { createSqliteDb, user, userSourceInstances, verification } from "."

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { force: true, recursive: true })))
})

describe("createSqliteDb", () => {
  it.skipIf(typeof Bun === "undefined")("prepares local auth and source tables", async () => {
    const dir = await mkdtemp(join(tmpdir(), "newsnext-data-sqlite-"))
    tempDirs.push(dir)

    const db = await createSqliteDb(join(dir, "data.sqlite"))
    const now = new Date()
    const timestamp = now.getTime()

    await db.insert(user).values({
      id: "user-test",
      name: "Test User",
      email: "test@example.com",
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    })

    await db.insert(verification).values({
      id: "verification-test",
      identifier: "oauth-state",
      value: "state",
      expiresAt: new Date(timestamp + 60_000),
      createdAt: now,
      updatedAt: now,
    })

    await db.insert(userSourceInstances).values({
      userId: "user-test",
      instanceId: "source-test",
      sourceKey: "github:default",
      params: {},
      isFork: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    const rows = await db.select().from(verification)
    expect(rows).toHaveLength(1)
  })
})
