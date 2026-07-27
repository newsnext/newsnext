import type { CliIO, CliWritable } from "./io"
import { describe, expect, it } from "vitest"
import { runCli } from "./cli"

class MemoryWritable implements CliWritable {
  value = ""

  write(value: string): void {
    this.value += value
  }
}

function createIO(): { io: CliIO, stdout: MemoryWritable, stderr: MemoryWritable } {
  const stdout = new MemoryWritable()
  const stderr = new MemoryWritable()
  return {
    io: { stdout, stderr },
    stdout,
    stderr,
  }
}

describe("newsNext CLI", () => {
  it("prints root help", async () => {
    const { io, stdout, stderr } = createIO()

    await expect(runCli([], io)).resolves.toBe(0)
    expect(stdout.value).toContain("newsnext <command>")
    expect(stdout.value).toContain("start")
    expect(stdout.value).toContain("restart")
    expect(stdout.value).toContain("status")
    expect(stdout.value).toContain("stop")
    expect(stdout.value).toContain("source")
    expect(stderr.value).toBe("")
  })

  it("prints source list help", async () => {
    const { io, stdout } = createIO()

    await expect(runCli(["source", "list", "--help"], io)).resolves.toBe(0)
    expect(stdout.value).toContain("List sources registered in a connected extension")
    expect(stdout.value).toContain("--browser")
    expect(stdout.value).toContain("--timeout")
  })

  it("prints restart help", async () => {
    const { io, stdout, stderr } = createIO()

    await expect(runCli(["restart", "--help"], io)).resolves.toBe(0)
    expect(stdout.value).toContain("Restart the NewsNext background server")
    expect(stdout.value).toContain("--ws-url")
    expect(stderr.value).toBe("")
  })

  it("reports unknown commands with a usage hint", async () => {
    const { io, stderr } = createIO()

    await expect(runCli(["missing"], io)).resolves.toBe(2)
    expect(stderr.value).toContain("Unknown command missing")
    expect(stderr.value).toContain("newsnext --help")
  })

  it("prints source run help without requiring a provider", async () => {
    const { io, stdout } = createIO()

    await expect(runCli(["source", "run", "--help"], io)).resolves.toBe(0)
    expect(stdout.value).toContain("--use-provider-secrets")
    expect(stdout.value).toContain("--watch")
  })
})
