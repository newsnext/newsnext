import type { Input } from "ky"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createSourceFetch } from "./fetch"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("createSourceFetch", () => {
  it("combines the execution signal with a request signal", async () => {
    let fetchSignal: AbortSignal | undefined
    const fetchMock = vi.fn((input: Input, init?: RequestInit) => {
      fetchSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined) ?? undefined
      return new Promise<Response>((_resolve, reject) => {
        fetchSignal?.addEventListener("abort", () => reject(fetchSignal?.reason), { once: true })
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    const execution = new AbortController()
    const request = new AbortController()
    const response = createSourceFetch(execution.signal).get("https://signals.example/items", {
      retry: 0,
      signal: request.signal,
      timeout: false,
    })

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(fetchSignal).not.toBe(execution.signal)
    expect(fetchSignal).not.toBe(request.signal)

    request.abort()
    await expect(response).rejects.toMatchObject({ name: "AbortError" })
    expect(execution.signal.aborted).toBe(false)
  })

  it("validates the final normalized request URL", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", {
      headers: { "content-type": "application/json" },
    }))
    vi.stubGlobal("fetch", fetchMock)
    const validateUrl = vi.fn()

    await createSourceFetch(undefined, validateUrl)
      .get("https://validation.example/items", {
        searchParams: { q: "news" },
      })
      .json()

    expect(validateUrl).toHaveBeenCalledOnce()
    expect(validateUrl).toHaveBeenCalledWith("https://validation.example/items?q=news")
  })
})
