import type { CallOptions, ClientOptions } from "./types.js"
import { spawn } from "node:child_process"
import process from "node:process"
import { NewsNextError, parseFrame, prepareRequest } from "./protocol.js"

const MAX_FRAME_LENGTH = 64 * 1024 * 1024

export async function* stream<T>(client: ClientOptions, request: object, options: CallOptions = {}): AsyncGenerator<T> {
  const signal = options.signal ?? client.signal
  signal?.throwIfAborted()
  const { payload: { timeoutMs }, serialized: input } = prepareRequest(request, options.timeoutMs ?? client.timeoutMs)
  const command = client.command ?? ["newsnext"]
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
