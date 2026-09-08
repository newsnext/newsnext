import type { CallOptions, ClientOptions } from "./types.js"
import { Buffer } from "node:buffer"
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import process from "node:process"
import { DEFAULT_TIMEOUT_MS, NewsNextError, parseFrame } from "./protocol.js"

const require = createRequire(import.meta.url)
const MAX_FRAME_LENGTH = 64 * 1024 * 1024

function defaultCommand(): readonly [string, ...string[]] {
  let modulePath: string
  try {
    modulePath = require.resolve("@newsnext/cli")
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "MODULE_NOT_FOUND") return ["newsnext"]
    throw error
  }
  const cli: unknown = require(modulePath)
  if (!cli || typeof cli !== "object" || !("resolveBinary" in cli) || typeof cli.resolveBinary !== "function") {
    throw new NewsNextError("CLI_PACKAGE_INVALID", "@newsnext/cli does not export resolveBinary()")
  }
  const binary: unknown = cli.resolveBinary()
  if (typeof binary !== "string") throw new NewsNextError("CLI_PACKAGE_INVALID", "Invalid CLI executable path")
  return [binary]
}

export async function* stream<T>(client: ClientOptions, request: object, options: CallOptions = {}): AsyncGenerator<T> {
  const signal = options.signal ?? client.signal
  signal?.throwIfAborted()
  const timeoutMs = options.timeoutMs ?? client.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 600_000) throw new RangeError("timeoutMs must be an integer between 1 and 600000")
  const command = client.command ?? defaultCommand()
  const input = JSON.stringify({ version: 1, timeoutMs, ...request })
  if (Buffer.byteLength(input) > 8 * 1024 * 1024) throw new RangeError("SDK request exceeds 8 MiB")
  const child = spawn(command[0], [...command.slice(1), "__sdk"], {
    cwd: client.cwd,
    env: { ...process.env, NEWSNEXT_ENV: client.environment ?? "production" },
    stdio: ["pipe", "pipe", "pipe"],
    detached: process.platform !== "win32",
    windowsHide: true,
  })
  let stderr = ""
  let failure: Error | undefined
  let closed = false
  const completion = new Promise<number | null>((resolve) => {
    child.on("error", (error) => {
      failure ??= error
    })
    child.on("close", (code) => {
      closed = true
      resolve(code)
    })
  })
  const kill = (): void => {
    if (closed || !child.pid) return
    try {
      if (process.platform !== "win32") process.kill(-child.pid, "SIGKILL")
      else child.kill("SIGKILL")
    } catch { /* The child may have exited between the check and the signal. */ }
  }
  const abort = (): void => {
    failure = new NewsNextError("ABORTED", "NewsNext request was aborted")
    kill()
  }
  signal?.addEventListener("abort", abort, { once: true })
  if (signal?.aborted) abort()
  child.stderr.setEncoding("utf8")
  child.stderr.on("data", (data: string) => {
    stderr = (stderr + data).slice(-8192)
  })
  child.stdin.on("error", (error) => {
    failure ??= error
  })
  child.stdin.end(input)
  const timer = setTimeout(() => {
    failure = new NewsNextError("TIMEOUT", "Timed out waiting for NewsNext CLI output")
    kill()
  }, timeoutMs + 2000)
  timer.unref()
  let ended = false
  try {
    child.stdout.setEncoding("utf8")
    let pending = ""
    for await (const chunk of child.stdout) {
      timer.refresh()
      pending += String(chunk)
      let newline = pending.indexOf("\n")
      while (newline >= 0) {
        if (failure) throw failure
        if (newline > MAX_FRAME_LENGTH) throw new NewsNextError("SDK_PROTOCOL_ERROR", "CLI frame exceeds 64 MiB")
        const line = pending.slice(0, newline)
        pending = pending.slice(newline + 1)
        newline = pending.indexOf("\n")
        if (ended) throw new NewsNextError("SDK_PROTOCOL_ERROR", "Received data after end of stream")
        const frame = parseFrame(line)
        if (frame.type === "error") throw new NewsNextError(frame.error.code, frame.error.message)
        if (frame.type === "end") {
          ended = true
        } else {
          // Consumer work must not count toward the CLI response timeout.
          clearTimeout(timer)
          yield frame.data as T
          timer.refresh()
        }
      }
      if (pending.length > MAX_FRAME_LENGTH) throw new NewsNextError("SDK_PROTOCOL_ERROR", "CLI frame exceeds 64 MiB")
    }
    const code = await completion
    if (failure) throw failure
    if (code !== 0) throw new NewsNextError("CLI_EXIT", `NewsNext exited with code ${code}: ${stderr.trim()}`)
    if (!ended || pending.length) throw new NewsNextError("SDK_PROTOCOL_ERROR", "CLI stream ended without a complete terminal frame")
  } catch (error) {
    throw failure ?? error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener("abort", abort)
    kill()
    await completion
  }
}

export async function call<T>(client: ClientOptions, request: object, options?: CallOptions): Promise<T> {
  let result: T | undefined
  let count = 0
  for await (const value of stream<T>(client, request, options)) {
    result = value
    count++
  }
  if (count !== 1) throw new NewsNextError("SDK_PROTOCOL_ERROR", `Expected one response, received ${count}`)
  return result as T
}
