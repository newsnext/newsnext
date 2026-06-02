import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { SqliteCacheAdapter } from "./sqlite"

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { force: true, recursive: true })))
})

describe("SqliteCacheAdapter", () => {
  it.skipIf(typeof Bun === "undefined")("stores cache entries with db0 and Bun SQLite", async () => {
    const dir = await mkdtemp(join(tmpdir(), "newsnext-cache-sqlite-"))
    tempDirs.push(dir)
    const adapter = await SqliteCacheAdapter.create(join(dir, "cache.sqlite"))

    await adapter.set("source:test", [{ title: "Hello" }])
    const entry = await adapter.get<Array<{ title: string }>>("source:test")

    expect(entry?.value).toEqual([{ title: "Hello" }])
    expect(entry?.updatedAt).toEqual(expect.any(Number))
  })
})
