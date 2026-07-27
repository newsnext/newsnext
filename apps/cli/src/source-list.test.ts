import type { CliIO, CliWritable } from "./io"
import { describe, expect, it, vi } from "vitest"

const { executeThroughDaemonMock } = vi.hoisted(() => ({
  executeThroughDaemonMock: vi.fn(),
}))

vi.mock("./daemon", () => ({
  executeThroughDaemon: executeThroughDaemonMock,
}))

const { runSourceListCommand } = await import("./source-list")

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

describe("source list command", () => {
  it("prints registered source IDs one per line", async () => {
    executeThroughDaemonMock.mockResolvedValue({
      data: ["github:trending", "hackernews:top"],
      instance: {
        id: "instance-id",
        browser: "chrome",
        extensionVersion: "0.0.1",
      },
    })
    const { io, stdout, stderr } = createIO()

    await expect(runSourceListCommand([
      "--browser",
      "chrome",
      "--timeout",
      "5",
    ], io)).resolves.toBe(0)

    expect(stdout.value).toBe("github:trending\nhackernews:top\n")
    expect(stderr.value).toBe("✓ 2 sources via chrome\n")
    expect(executeThroughDaemonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        browser: "chrome",
        timeoutMs: 5_000,
        request: expect.objectContaining({ type: "source.list" }),
      }),
      expect.objectContaining({
        browser: "chrome",
        timeoutMs: 5_000,
      }),
    )
  })

  it("rejects malformed extension results", async () => {
    executeThroughDaemonMock.mockResolvedValue({
      data: [{ id: "github:trending" }],
      instance: {
        id: "instance-id",
        browser: "chrome",
        extensionVersion: "0.0.1",
      },
    })
    const { io } = createIO()

    await expect(runSourceListCommand([], io)).rejects.toThrow(
      "The extension returned an invalid source list",
    )
  })
})
